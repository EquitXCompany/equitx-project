#!/bin/bash

# Load environment variables from the parent directory
source "$(dirname "$0")/../.env"

# Declare a plain array to hold contract data
declare -a contract_args=()

# Function to parse the plain text file into a key-value structure
load_contract_ids() {
    local file_path="$1"
    while IFS=: read -r key value; do
        contract_args+=("--contracts" "$value")
    done < "$file_path"
}

# Source the existing contracts file
load_contract_ids "$(dirname "$0")/existing_contracts.txt"

# Construct and execute the catchup command
cmd=(
    mercury-cli
    --jwt "$MERCURY_JWT"
    --local false
    --mainnet false
    catchup
    --retroshades true
    "${contract_args[@]}"
    --project-name "equitx"
)

echo "Running catchup command: ${cmd[*]}"
"${cmd[@]}"

echo "Catchup request complete."