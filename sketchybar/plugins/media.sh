#!/bin/bash

# loads all defined colors
source "$CONFIG_DIR/variables.sh"

STATE="$(echo "$INFO" | jq -r '.state')"
if [ "$STATE" = "playing" ]; then
  MEDIA="$(echo "$INFO" | jq -r '.title + " - " + .artist')"
  APP="$(echo "$INFO" | jq -r '.app')"
  if [ "$APP" = "Spotify" ]; then
    ICON=":spotify:"
  else
    ICON=":music:"
  fi
  sketchybar --set $NAME \
    label="$MEDIA" \
    drawing=on \
    icon=$ICON
else
  sketchybar --set $NAME \
    drawing=off
fi
