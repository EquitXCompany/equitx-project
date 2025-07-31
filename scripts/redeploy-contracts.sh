#!/bin/bash

# Check if both arguments are provided
if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Usage: $0 <source-account> <wasm-hash>"
    echo "Example: $0 alice a704d555a4968087ec4fba9417fac5cd0d4918172c1fec6a29dfdcc472228d07"
    exit 1
fi

SOURCE_ACCOUNT="$1"
WASM_HASH="$2"

# Read the existing contracts file
CONTRACTS_FILE="scripts/existing_contracts.txt"

if [ ! -f "$CONTRACTS_FILE" ]; then
    echo "Error: $CONTRACTS_FILE not found"
    exit 1
fi

echo "Redeploying contracts with WASM hash: $WASM_HASH"
echo "Using source account: $SOURCE_ACCOUNT"
echo "---"

# Parse and redeploy each contract
while IFS=':' read -r contract_name contract_id; do
    # Remove quotes and whitespace
    contract_name=$(echo "$contract_name" | tr -d '"' | xargs)
    contract_id=$(echo "$contract_id" | tr -d '"' | xargs)
    
    echo "Redeploying $contract_name ($contract_id)..."
    
    stellar contract invoke \
        --id "$contract_id" \
        --source "$SOURCE_ACCOUNT" \
        --network testnet \
        -- \
        redeploy \
        --wasm_hash "$WASM_HASH"
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully redeployed $contract_name"
    else
        echo "❌ Failed to redeploy $contract_name"
    fi
    
    echo "---"
    
done < "$CONTRACTS_FILE"

echo "Redeploy process completed!"