#!/bin/bash

# Get the parent directory of the script's folder
PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"

# Load environment variables
source "$PROJECT_DIR/.env"

# Build with mercury features
echo "Building with Mercury features..."
loam build --features mercury

WASM_FILE="$PROJECT_DIR/target/loam/xasset.wasm"

# Build contracts array for mercury-cli
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

# Deploy to Mercury once with all contracts
echo "Deploying contracts to Mercury Retroshades..."

# Construct and execute the command using arrays to preserve proper argument handling
cmd=(
    mercury-cli
    --jwt "$MERCURY_JWT"
    --mainnet false
    retroshade
    --project "equitx"
    "${contract_args[@]}"
    --target "$WASM_FILE"
)

echo "Running command: ${cmd[*]}"
DEPLOY_OUTPUT=$("${cmd[@]}")

# Extract wasm hash from output
WASM_HASH=$(echo "$DEPLOY_OUTPUT" | grep -o 'wasm hash: [a-f0-9]\+' | cut -d' ' -f3)

echo $WASM_HASH

echo "Deployment complete. Update WASM_HASH in application environment to $WASM_HASH."