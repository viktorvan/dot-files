#!/bin/bash

sketchybar --add item cpu right \
  --set cpu update_freq=10 \
  icon.color=$BLACK \
  icon.font="sketchybar-app-font:Regular:16.0" \
  label.color=$BLACK \
  script="$PLUGIN_DIR/cpu.sh"
