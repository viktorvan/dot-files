#!/usr/bin/env bash

tmux new-window -c "#{pane_current_path}"
tmux split-window -c "#{pane_current_path}"
tmux split-window -c "#{pane_current_path}"
tmux select-layout even-horizontal
