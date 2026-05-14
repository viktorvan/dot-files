#!/usr/bin/env bash

az account set --subscription "Microsoft Azure Sponsorship Development"

# Store the current working directory
cwd=$(tmux display -p -F "#{pane_current_path}")

# create new tmux window
tmux new-window -n "az-dev-tunnel" -c "$cwd"

# Create the first new pane (pane 1) in the current directory without running a command
tmux split-window -v -d -c "$cwd"

# Arrange the panes evenly
tmux select-layout even-vertical

# Send commands to each pane
#
tmux send-keys -t 1 "bash -c 'resource_id=\"/subscriptions/0b3f76b0-4294-4ee5-a1fa-e3320f5c6482/resourceGroups/rg-medoma-net-dev/providers/Microsoft.Compute/virtualMachines/medoma-jumpbox-dev\"; az network bastion tunnel --name \"bastion-medoma-dev\" --resource-group \"rg-medoma-net-dev\" --target-resource-id \$resource_id --resource-port 22 --port 50022'" C-m
tmux send-keys -t 2 "sleep 2 && ssh -L 55432:db-medoma-shared-dev.postgres.database.azure.com:5432 -p 50022 medoma@localhost" C-m

