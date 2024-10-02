#!/bin/bash

export STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
export STELLAR_RPC_URL="https://soroban-testnet.stellar.org"
export STELLAR_ACCOUNT=equitxtestnet

rm -rf target/loam
loam build
export XUSD=$(stellar contract deploy --wasm target/loam/xasset.wasm)
stellar contract invoke --id $XUSD -- admin_set --new-admin equitxtestnet
stellar contract invoke --id $XUSD -- cdp_init --xlm_sac "$(stellar contract id asset --asset native)" --xlm_contract "$(stellar contract alias show data_feed)" --asset_contract "$(stellar contract alias show data_feed)" --pegged_asset USD --min_collat_ratio 11000 --symbol xUSD --name "United States Dollar xAsset" --decimals 7
sed -i.bak 's/xasset = { id = "\([^"]*\)"/xasset = { id = "'$XUSD'"/' environments.toml
rm environments.toml.bak
LOAM_ENV=staging loam build --build-clients
echo ""
echo "Deployed xasset contract with id $XUSD. Updated environments.toml. Built clients."
