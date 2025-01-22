#!/bin/bash

# Function to generate a random user name
generate_random_user() {
    echo "user_$(openssl rand -hex 4)"
}

# Create random users array
USERS=()
for _ in {1..3}; do
    USERS+=("$(generate_random_user)")
done

XASSET_ID=$(awk -F'"' '/xasset = \{ id = / {print $2; exit}' environments.toml)
if [ -z "$XASSET_ID" ]; then
    echo "Error: Unable to find xasset contract ID in environments.toml"
    exit 1
fi

# Function to open CDP and stake
open_cdp_and_stake() {
    local user=$1
    local collateral=$2
    local asset_lent=$3
    local stake_amount=$4

    echo "Processing user: $user"

    stellar keys generate $user
    # Open CDP
    stellar contract invoke --rpc-url https://soroban-testnet.stellar.org --network-passphrase "Test SDF Network ; September 2015" --id $XASSET_ID -- \
        open_cdp --lender $user --collateral $collateral --asset-lent $asset_lent

    # Stake in stability pool
    stellar contract invoke --rpc-url https://soroban-testnet.stellar.org --network-passphrase "Test SDF Network ; September 2015" --id $XASSET_ID -- \
        stake --from $user --amount $stake_amount

    echo "CDP opened and staked for $user"
    echo "------------------------"
}

# Main execution
echo "Creating test data for xasset contract"
echo "------------------------"

# Process each random user
for user in "${USERS[@]}"; do
    open_cdp_and_stake "$user" 2000000000 150000000 100000000
done

echo "Test data creation completed."