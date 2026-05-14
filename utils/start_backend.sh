#!/usr/bin/env bash

# Parse mode flag (mutually exclusive)
mode="default"
for arg in "$@"; do
  [[ "$arg" == "--no-sleep" ]] && mode="no-sleep"
  [[ "$arg" == "--prepare"  ]] && mode="prepare"
  [[ "$arg" == "--delay"    ]] && mode="delay"
done

# Store the current working directory
cwd=$(tmux display -p -F "#{pane_current_path}")

# Split the current pane horizontally to create a new column on the far right
pane1=$(tmux split-window -h -d -P -F "#{pane_id}" -c "$cwd")

# Split pane1 vertically to create pane2
pane2=$(tmux split-window -v -d -P -F "#{pane_id}" -t "$pane1" -c "$cwd")

# Split pane2 vertically to create pane3
pane3=$(tmux split-window -v -d -P -F "#{pane_id}" -t "$pane2" -c "$cwd")

# Send commands to each pane
case "$mode" in
  default)
    tmux send-keys -t "$pane1" "j run-auth" C-m
    tmux send-keys -t "$pane2" "sleep 10 && j run-logistics" C-m
    tmux send-keys -t "$pane3" "sleep 20 && j run-patient" C-m
    ;;
  no-sleep)
    tmux send-keys -t "$pane1" "j run-auth" C-m
    tmux send-keys -t "$pane2" "j run-logistics" C-m
    tmux send-keys -t "$pane3" "j run-patient" C-m
    ;;
  prepare)
    tmux send-keys -t "$pane1" "j run-auth"
    tmux send-keys -t "$pane2" "j run-logistics"
    tmux send-keys -t "$pane3" "j run-patient"
    ;;
  delay)
    poll_auth="until curl -sk -o /dev/null -w '%{http_code}' https://localhost:5001/status | grep -q 200; do sleep 5; done"
    poll_patient="until curl -sk -o /dev/null -w '%{http_code}' https://localhost:7023/status | grep -q 200; do sleep 5; done"

    cmd_auth="dotnet build src/Auth && j run-auth"
    cmd_patient="dotnet build src/Patient.API && $poll_auth && j run-patient"
    cmd_logistics="$poll_auth && dotnet build src/Logistics.API && $poll_patient && j run-logistics"

    tmux send-keys -t "$pane1" "$cmd_auth" C-m
    tmux send-keys -t "$pane2" "$cmd_logistics" C-m
    tmux send-keys -t "$pane3" "$cmd_patient" C-m
    ;;
esac
