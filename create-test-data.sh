#!/bin/bash

# Function to generate a random user name
generate_random_user() {
    echo "user_$(openssl rand -hex 4)"
}

# Function to get contract value
get_contract_value() {
    local contract_id=$1
    local method=$2
    stellar contract invoke --rpc-url https://soroban-testnet.stellar.org \
        --network-passphrase "Test SDF Network ; September 2015" \
        --id "$contract_id" -- "$method" | grep -o '"price":"[^"]*"' | cut -d'"' -f4
}


# Function to get asset price
get_asset_price() {
    local contract_id=$1
    local price_method=$2
    local price=$(get_contract_value "$contract_id" "$price_method")
    echo "$price"
}

# Function to calculate asset lent based on desired CR
calculate_asset_lent() {
    local xlm_amount=$1
    local xlm_price=$2
    local asset_price=$3
    local desired_cr=$4
    
    # Use bc for floating point arithmetic
    # Formula: (xlm_amount * xlm_price) / (desired_cr * asset_price)
    echo "scale=0; 10000 * ($xlm_amount * $xlm_price) / ($desired_cr * $asset_price)" | bc
}

# Function to open CDP and optionally stake
open_cdp_and_maybe_stake() {
    local user=$1
    local contract_id=$2
    local collateral=$3
    local asset_lent=$4

    echo "Processing user: $user for contract: $contract_id"

    # Generate Stellar keys for the user
    stellar keys generate "$user"

    # Open CDP
    stellar contract invoke --rpc-url https://soroban-testnet.stellar.org \
        --network-passphrase "Test SDF Network ; September 2015" \
        --id "$contract_id" -- \
        open_cdp --lender "$user" --collateral "$collateral" --asset-lent "$asset_lent"

    echo "Opened CDP with $collateral XLM as collateral and $asset_lent asset lent on contract $contract_id for $user"

    # 50% chance to stake
    if [ $((RANDOM % 2)) -eq 0 ]; then
        # Random stake amount between 1% and 100% of asset_lent
        local stake_percentage=$(( (RANDOM % 100) + 1 ))
        local stake_amount=$(( asset_lent * stake_percentage / 100 ))
        
        stellar contract invoke --rpc-url https://soroban-testnet.stellar.org \
            --network-passphrase "Test SDF Network ; September 2015" \
            --id "$contract_id" -- \
            stake --from "$user" --amount "$stake_amount"
        
        echo "Staked $stake_amount for $user"
    else
        echo "No stake created for $user"
    fi

    echo "------------------------"
}

# Read contract IDs from environments.toml
declare -A CONTRACT_IDS
while IFS='=' read -r key value; do
    if [[ $key =~ ^x[A-Z]+ ]]; then
        # Updated pattern to extract only the contract ID
        contract_id=$(echo "$value" | grep -o '"[A-Z0-9]\{56\}"' | tr -d '"')
        CONTRACT_IDS["$key"]=$contract_id
    fi
done < <(grep '^x[A-Z]\+ = { id = ' environments.toml)

# Main execution
echo "Creating test data for xasset contracts"
echo "------------------------"

# Number of users to generate per contract
USERS_PER_CONTRACT=5

# Process each contract
for contract_name in "${!CONTRACT_IDS[@]}"; do
    contract_id="${CONTRACT_IDS[$contract_name]}"
    
    echo "Processing contract: $contract_name ($contract_id)"
    
    # Get minimum CR and prices
    min_cr=$(get_contract_value "$contract_id" "minimum_collateralization_ratio")
    # Convert min_cr to an integer (removing decimal places)
    min_cr=${min_cr:-11000}  # Default to 15000 if empty
    
    xlm_price=$(get_asset_price "$contract_id" "lastprice_xlm")
    xlm_price=${xlm_price:-10000000}  # Default if empty
    
    asset_price=$(get_asset_price "$contract_id" "lastprice_asset")
    asset_price=${asset_price:-100000000}  # Default if empty
    
    # Generate users and create CDPs
    for ((i=1; i<=USERS_PER_CONTRACT; i++)); do
        user=$(generate_random_user)
        
        # Random XLM amount between 100 and 9900 XLM (in stroops)
        xlm_amount=$((RANDOM % 9800 + 100))0000000
        
        # Random CR between min_cr and 200% (20000)
        cr_range=$((100000 - min_cr))
        cr_range=${cr_range:-18900}  # Default range if calculation results in 0
        random_cr_addition=$((RANDOM % cr_range))
        desired_cr=$((min_cr + random_cr_addition))
        
        # Calculate asset_lent based on desired CR
        asset_lent=$(calculate_asset_lent "$xlm_amount" "$xlm_price" "$asset_price" "$desired_cr")
        
        open_cdp_and_maybe_stake "$user" "$contract_id" "$xlm_amount" "$asset_lent"
    done
done

echo "Test data creation completed."