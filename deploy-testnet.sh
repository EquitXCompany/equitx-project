#!/bin/bash

export STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
export STELLAR_RPC_URL="https://soroban-testnet.stellar.org"
export STELLAR_ACCOUNT=equitxtestnet

rm -rf target/loam
loam build 

# Deploy and initialize contracts for each asset
DATAFEED="CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63"

# Start by creating the contractConfig.ts file
echo "// This file is auto-generated. Do not edit manually." > src/contracts/contractConfig.ts
echo "export const contractMapping = {" >> src/contracts/contractConfig.ts

# Create a temporary array to store all symbols for util.ts generation
declare -a SYMBOLS=()

deploy_xasset() {
    local asset=$1
    local symbol="x$asset"
    local name="$asset xAsset"
    
    SYMBOLS+=("$symbol")  # Add symbol to array for util.ts generation
    
    echo "Deploying $symbol..."
    local contract_id=$(stellar contract deploy --wasm target/loam/xasset.wasm)
    stellar contract invoke --id $contract_id -- admin_set --new-admin equitxtestnet
    stellar contract invoke --id $contract_id -- cdp_init --xlm_sac "$(stellar contract id asset --asset native)" --xlm_contract "$DATAFEED" --asset_contract "$DATAFEED" --pegged_asset "$asset" --min_collat_ratio 11000 --symbol "$symbol" --name "$name" --decimals 7 --annual_interest_rate 100
    
    # Update environments.toml
    if grep -q "^$symbol = { id = " environments.toml; then
        sed -i.bak "s/$symbol = { id = \"[^\"]*\"/$symbol = { id = \"$contract_id\"/" environments.toml
    else
        sed -i.bak "/\[staging\.contracts\]/a $symbol = { id = \"$contract_id\" }" environments.toml
    fi

    # Add to contract config
    echo "  $symbol: \"$contract_id\"," >> src/contracts/contractConfig.ts
    
    echo "Deployed $symbol contract with id $contract_id"
}

# Deploy all assets
assets=("BTC" "ETH" "USDT" "XRP" "SOL" "ADA" "DOT")

for asset in "${assets[@]}"; do
    deploy_xasset $asset
done

# Finish contractConfig.ts
echo "} as const;" >> src/contracts/contractConfig.ts
echo "" >> src/contracts/contractConfig.ts
echo "export type XAssetSymbol = keyof typeof contractMapping;" >> src/contracts/contractConfig.ts

# Generate new util.ts
cat > src/contracts/util.ts << EOL
export const rpcUrl =
  import.meta.env.PUBLIC_RPC_URL ?? "http://localhost:8000/rpc";
export const networkPassphrase =
  import.meta.env.PUBLIC_NETWORK_PASSPHRASE ??
  "Standalone Network ; February 2017";

import { contractMapping, XAssetSymbol } from "./contractConfig";
import { Client, Errors } from "${SYMBOLS[0]}";
export type XAssetContract = Client;
export const ContractErrors = Errors;

const contractClientMap = {
$(for symbol in "${SYMBOLS[@]}"; do
  echo "  $symbol: new Client({"
  echo "    networkPassphrase,"
  echo "    contractId: contractMapping.$symbol,"
  echo "    rpcUrl,"
  echo "    publicKey: undefined,"
  echo "  }),"
done)
} as const;

// Get contract instance by symbol
export const getContractBySymbol = (symbol: XAssetSymbol): XAssetContract => {
  return contractClientMap[symbol];
};

// Preload all contracts
export const preloadContracts = () => {
  const contracts: Record<XAssetSymbol, XAssetContract> = {} as Record<
    XAssetSymbol,
    XAssetContract
  >;

  for (const [symbol, _contractId] of Object.entries(contractMapping)) {
    const clientModule = getContractBySymbol(symbol as XAssetSymbol);
    contracts[symbol as XAssetSymbol] = clientModule;
  }

  return contracts;
};
EOL

rm environments.toml.bak
LOAM_ENV=staging loam build --build-clients
echo ""
echo "All xAsset contracts deployed. Updated environments.toml and util.ts. Built clients."