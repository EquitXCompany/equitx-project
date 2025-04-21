#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Load environment variables
source "$SCRIPT_DIR/.env"

# Read contract IDs from contractConfig.ts
CONFIG_FILE="$SCRIPT_DIR/src/contracts/contractConfig.ts"

# Build contracts array for mercury-cli
declare -a contract_args=()
while IFS= read -r line; do
    if [[ $line =~ x[A-Z]+:[[:space:]]*\"([A-Z0-9]+)\" ]]; then
        contract_id="${BASH_REMATCH[1]}"
        contract_args+=("--contracts" "$contract_id")
    fi
done < <(grep -E "x[A-Z]+: \"[A-Z0-9]+\"" "$CONFIG_FILE")

# Construct and execute the catchup command
cmd=(
    mercury-cli
    --key "$MERCURY_KEY"
    --local false
    --mainnet false
    catchup
    --retroshades true
    "${contract_args[@]}"
    --project-name "equitx"
)

echo "Running catchup command: ${cmd[*]}"
"${cmd[@]}"

echo "Catchup complete."