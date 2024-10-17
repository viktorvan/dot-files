#!/bin/bash

source "$CONFIG_DIR/variables.sh"

sketchybar --add item media q \
  --set media \
  icon.font="sketchybar-app-font:Regular:15.0" \
  scroll_texts=on \
  updates=on \
  script="$PLUGIN_DIR/media.sh" \
  --subscribe media media_change
