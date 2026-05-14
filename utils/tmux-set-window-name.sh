#!/bin/bash

# Ensure a branch name is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <branch-name>"
    exit 1
fi

branch_name=$(basename "$1")

# if [[ "$branch_name" =~ ^med-[0-9]{4,5}-(.+) ]]; then
#     branch_name="${BASH_REMATCH[1]}"
# fi

session_name=$(tmux display-message -p "#S")
clean_name=$(echo "$branch_name" | tr "./" "__")

# Rename the current tmux window

tmux rename-window -t "$session_name" "$clean_name"

# Shift arguments and send remaining keys to the renamed window
shift
tmux send-keys "$*"
