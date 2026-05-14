#!/bin/bash

# Ensure a branch name is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <branch-name>"
    exit 1
fi

branch_name=$(basename "$1")
session_name=$(tmux display-message -p "#S")
clean_name=$(echo "$branch_name" | tr "./" "__")
target="$session_name:$clean_name"

# Create a new tmux window if it doesn't exist
if ! tmux list-windows -F "#W" | grep -q "^$clean_name$"; then
    tmux new-window -dn "$clean_name"
fi

# Try to change directory to the one matching branch_name using `z`
tmux send-keys -t "$target" "z $branch_name && clear" Enter

# Shift arguments and send remaining keys to the window
shift
tmux send-keys -t "$target" "$*"
