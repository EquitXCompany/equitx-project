#!/bin/bash

# Upload new xasset wasm and update orchestrator to use it. To deploy new mainnet contracts, use scripts/deploy-mainnet.sh
# Update existing assets to use the new xasset wasm

export STELLAR_NETWORK_PASSPHRASE="Public Global Stellar Network ; September 2015"
export STELLAR_RPC_URL="https://rpc.lightsail.network/"
export STELLAR_ACCOUNT=equitxmainnet
export STELLAR_NETWORK=mainnet

rm -rf target/stellar
stellar scaffold build production
stellar contract optimize --wasm target/stellar/orchestrator.wasm
stellar contract optimize --wasm target/stellar/xasset.wasm

# Find orchestrator contract ID in environments.toml
orchestrator_id=$(awk -F'"' '/^\[production\.contracts\]/ {found=1} found && /orchestrator = { id = / {print $2; exit}' environments.toml)
echo "Orchestrator ID: $orchestrator_id"
if [[ -z "$orchestrator_id" ]]; then
  echo "Error: Orchestrator contract ID not found in environments.toml"
  exit 1
fi

# Upload new wasm and redeploy orchestrator
echo "Uploading orchestrator wasm..."
orchestrator_wasm_hash=$(stellar contract upload --wasm target/stellar/orchestrator.optimized.wasm --source equitxmainnet)
echo "Redeploying orchestrator with wasm hash: $orchestrator_wasm_hash"
orchestrator_result=$(stellar contract invoke --id $orchestrator_id -- redeploy --wasm_hash $orchestrator_wasm_hash)
echo $orchestrator_result

echo "Uploading xasset contract..."
xasset_wasm_hash=$(stellar contract upload --wasm target/stellar/xasset.optimized.wasm --source equitxmainnet)
if [[ -z "$xasset_wasm_hash" ]]; then
  echo "Error: xasset wasm hash not found"
  exit 1
fi
echo "xasset wasm hash: $xasset_wasm_hash"

echo "Updating orchestrator xasset $xasset_wasm_hash ..."
stellar contract invoke --id $orchestrator_id -- update_xasset_wasm_hash --xasset_wasm_hash "$xasset_wasm_hash"

update_xasset() {
  local asset=$1
  local symbol="x$asset"
  echo "Updating $symbol."
  stellar contract invoke --id $orchestrator_id -- upgrade_existing_asset_contract --asset_symbol "$symbol"
}

# Update mainnet assets
assets=("BTC" "ETH" "USDT")

for asset in "${assets[@]}"; do
    update_xasset "$asset"
done

