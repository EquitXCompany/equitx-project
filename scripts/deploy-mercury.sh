#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Load environment variables
source "$SCRIPT_DIR/.env"

# Build with mercury features
echo "Building with Mercury features..."
loam build --features mercury

# Read contract IDs from contractConfig.ts
CONFIG_FILE="$SCRIPT_DIR/src/contracts/contractConfig.ts"
WASM_FILE="$SCRIPT_DIR/target/loam/xasset.wasm"

# Create new AssetConfig.ts 
cat > "$SCRIPT_DIR/server/src/config/AssetConfig.ts" << 'EOL'
interface AssetDetails {
  feed_address: string;
  pool_address: string;
  wasm_hash: string;
}

export interface AssetConfig {
  [key: string]: AssetDetails;
}

export const XLM_FEED_ADDRESS = "CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63";
export const assetConfig: AssetConfig = {
EOL

# Build contracts array for mercury-cli
declare -a contract_args=()
while IFS= read -r line; do
    if [[ $line =~ x[A-Z]+:[[:space:]]*\"([A-Z0-9]+)\" ]]; then
        contract_id="${BASH_REMATCH[1]}"
        contract_args+=("--contracts" "$contract_id")
        CONTRACT_IDS+=("$contract_id")
        SYMBOLS+=("$(echo "$line" | cut -d: -f1 | tr -d ' ')")
    fi
done < <(grep -E "x[A-Z]+: \"[A-Z0-9]+\"" "$CONFIG_FILE")

# Deploy to Mercury once with all contracts
echo "Deploying contracts to Mercury Retroshades..."

# Construct and execute the command using arrays to preserve proper argument handling
cmd=(
    mercury-cli
    --key "$MERCURY_KEY"
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

# Add each asset to config file
for i in "${!CONTRACT_IDS[@]}"; do
    asset=${SYMBOLS[$i]}
    contract_id=${CONTRACT_IDS[$i]}
    
    cat >> "$SCRIPT_DIR/server/src/config/AssetConfig.ts" << EOL
  '$asset': {
    feed_address: "CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63",
    pool_address: "$contract_id",
    wasm_hash: "$WASM_HASH",
  },
EOL

    echo "Added $asset configuration with wasm hash: $WASM_HASH"
done

# Close the config object
cat >> "$SCRIPT_DIR/server/src/config/AssetConfig.ts" << EOL
}
EOL

echo "Deployment complete. AssetConfig.ts has been updated."