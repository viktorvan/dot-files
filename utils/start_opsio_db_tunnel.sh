#!/usr/bin/env bash

# Store the current working directory
cwd=$(tmux display -p -F "#{pane_current_path}")

# create new tmux window
tmux new-window -n "opsio-tunnel" -c "$cwd"

# Send SSH tunnel command to the new window
tmux send-keys "ssh -L 55430:10.228.20.11:5432 -p 2201 -N -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes ubuntu@81.91.13.100" C-m

