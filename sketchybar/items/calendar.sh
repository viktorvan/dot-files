#!/bin/bash

sketchybar --add item calendar right \
  --set calendar icon="" \
  update_freq=30 \
  background.padding_right=0 \
  script="$PLUGIN_DIR/calendar.sh"
