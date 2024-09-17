#!/bin/bash

export STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
export STELLAR_RPC_URL="https://soroban-testnet.stellar.org"
export STELLAR_ACCOUNT=equitx

rm -rf target/loam
loam build
export XUSD=$(stellar contract deploy --wasm target/loam/xasset.wasm)
stellar contract invoke --id $XUSD -- admin_set --new-admin equitx
stellar contract invoke --id $XUSD -- set_xlm_address --to "$(stellar contract id asset --asset native)"
stellar contract invoke --id $XUSD -- set_pegged_contract --to "$(stellar contract alias show data_feed)"
stellar contract invoke --id $XUSD -- set_pegged_asset --to XLM
stellar contract invoke --id $XUSD -- set_min_collat_ratio --to 15000
sed -i.bak 's/xasset = { id = "\([^"]*\)"/xasset = { id = "'$XUSD'"/' environments.toml
rm environments.toml.bak
LOAM_ENV=staging loam build --build-clients
echo ""
echo "Deployed xasset contract with id $XUSD. Updated environments.toml. Built clients."
