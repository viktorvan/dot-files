#!/bin/bash

sketchybar --add event docker_executed

sketchybar --add item docker right \
  --subscribe docker docker_executed \
  --set docker update_freq=300 \
  icon.font="sketchybar-app-font:Regular:15.0" \
  icon=":docker:" \
  drawing=off \
  script="$PLUGIN_DIR/docker.sh"
