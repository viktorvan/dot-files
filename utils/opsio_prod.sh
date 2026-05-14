


# Store the current working directory
cwd=$(tmux display -p -F "#{pane_current_path}")

# create new tmux window
tmux new-window -n "opsio" -c "$cwd"

# Connect with ssh
tmux send-keys -t "opsio" "ssh -t ubuntu@81.91.13.100 -p 2201 'export TERM=xterm-256color; bash'" C-m
