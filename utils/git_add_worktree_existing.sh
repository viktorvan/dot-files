#!/bin/bash

# Ensure a branch name is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <branch-name>"
    exit 1
fi

branch_name="$1"

# Regex pattern to match "med-XXXX-" where XXXX is 4-5 digits
if [[ "$branch_name" =~ ^med-([0-9]{4,5})- ]]; then
    folder_name="../med-${BASH_REMATCH[1]}"  # Extract "med-XXXX" dynamically
else
    folder_name="../$branch_name"
fi

# Attempt to add worktree, retry with underscores if needed
attempt=0
while true; do
    if git worktree add "$folder_name" "$branch_name"; then
        echo "Worktree added at $folder_name"
        exit 0
    elif [[ $? -ne 0 && -d "$folder_name" ]]; then
        attempt=$((attempt + 1))
        folder_name="${folder_name}_"
    else
        echo "Failed to add worktree."
        exit 1
    fi

done

