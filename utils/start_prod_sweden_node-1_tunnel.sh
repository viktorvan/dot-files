#!/usr/bin/env bash

az account set --subscription "Microsoft Azure Sponsorship Production"

# Store the current working directory
cwd=$(tmux display -p -F "#{pane_current_path}")

# create new tmux window
tmux new-window -n "az-prod-sweden-node-1-tunnel" -c "$cwd"

# Create the first new pane (pane 1) in the current directory without running a command
tmux split-window -v -d -c "$cwd"

# Arrange the panes evenly
tmux select-layout even-vertical

# Send commands to each pane
#
tmux send-keys -t 1 "bash -c 'resource_id=\"/subscriptions/d8c091c5-b526-454e-be5a-eb67e5ab8b18/resourceGroups/rg-medoma-swarm-prod/providers/Microsoft.Compute/virtualMachines/vm-swarm-node-sweden-prod-1\"; az network bastion tunnel --name \"bastion-medoma-prod\" --resource-group \"rg-medoma-bastion-prod\" --target-resource-id \$resource_id --resource-port 22 --port 52222'" C-m
tmux send-keys -t 2 "sleep 2 && ssh prod-sweden-node-1" C-m


