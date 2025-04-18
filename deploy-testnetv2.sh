#!/bin/bash

export STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
export STELLAR_RPC_URL="https://soroban-testnet.stellar.org"
export STELLAR_ACCOUNT=equitxtestnet

rm -rf target/loam
loam build 

# Deploy and initialize contracts for each asset
DATAFEED="CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63"

echo "Uploading xasset contract..."
xasset_wasm_hash=$(stellar contract upload --wasm target/loam/xasset.wasm --source equitxtestnet)
echo "Deploying orchestrator contract..."
contract_id=$(stellar contract deploy --wasm target/loam/orchestrator.wasm --source equitxtestnet)
stellar contract invoke --id $contract_id -- admin_set --new-admin equitxtestnet
stellar contract invoke --id $contract_id -- init --xlm_sac "$(stellar contract id asset --asset native)" --xlm_contract "$DATAFEED" --xasset_wasm_hash "$xasset_wasm_hash"

# Declare a regular array to store asset-to-contract mappings
asset_contract_map=()

deploy_xasset() {
  local asset=$1
  local symbol="x$asset"
  local name="$asset xAsset"
  echo "Deploying $symbol. FYI: Error #3 is AssetAlreadyDeployed if it appears"
  # Capture the result of the contract invoke call
  local contract_result=$(stellar contract invoke --id $contract_id -- deploy_asset_contract --asset_contract "$DATAFEED" --pegged_asset "$asset" --min_collat_ratio 11000 --symbol "$symbol" --name "$name" --decimals 7 --annual_interest_rate 100)
  # Store the result in the array as "key=value"
  asset_contract_map+=("$asset=$contract_result")
}

# Deploy testnet assets
assets=("BTC" "ETH" "USDT" "XRP" "SOL" "ADA" "DOT")

for asset in "${assets[@]}"; do
    deploy_xasset "$asset"
done

# Update environments.toml to point to the deployed orchestrator
if grep -q "^orchestrator = { id = " environments.toml; then
    sed -i.bak "s/orchestrator = { id = \"[^\"]*\" }/orchestrator = { id = \"$contract_id\" }/" environments.toml
else
    sed -i.bak "/\[staging\.contracts\]/a\\
orchestrator = { id = \"$contract_id\" }" environments.toml
fi

# Remove backup environments.toml file
rm environments.toml.bak
LOAM_ENV=staging loam build --build-clients
npm run install:contracts
echo ""

echo "Deployed orchestrator contract with id $contract_id"

# Print the asset-to-contract map
# will need to update database and mercury
echo "Asset-to-Contract Map:"
for entry in "${asset_contract_map[@]}"; do
    IFS="=" read -r asset contract <<< "$entry"
    echo "$asset: $contract"
done
echo "All xAsset contracts deployed. Updated environments.toml. Built clients."