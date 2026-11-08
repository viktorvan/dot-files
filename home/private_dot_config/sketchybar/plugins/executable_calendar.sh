#!/bin/bash

# loads all defined colors
source "$CONFIG_DIR/variables.sh"

# adding it to sketchybar
sketchybar --set $NAME \
  label="$(date +'%a %d %b %H:%M')"
