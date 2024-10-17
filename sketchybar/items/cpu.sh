#!/bin/bash

sketchybar --add item cpu right \
  --set cpu update_freq=10 \
  icon.font="sketchybar-app-font:Regular:15.0" \
  script="$PLUGIN_DIR/cpu.sh"
