#!/bin/bash

# loads all defined colors
source "$CONFIG_DIR/variables.sh"

STATE="$(echo "$INFO" | jq -r '.state')"
if [ "$STATE" = "playing" ]; then
  MEDIA="$(echo "$INFO" | jq -r '.title + " - " + .artist')"
  sketchybar --set $NAME \
    label="$MEDIA" \
    drawing=on \
    background.color=$ACCENT_COLOR \
    label.color=$BLACK \
    icon.color=$BLACK
else
  sketchybar --set $NAME drawing=off
fi
