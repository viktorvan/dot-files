#!/bin/bash

# loads all defined colors
source "$CONFIG_DIR/variables.sh"

STATE="$(echo "$INFO" | jq -r '.state')"
if [ "$STATE" = "playing" ]; then
  MEDIA="$(echo "$INFO" | jq -r '.title + " - " + .artist')"
  APP="$(echo "$INFO" | jq -r '.app')"
  if [ "$APP" = "Spotify" ]; then
    sketchybar --set $NAME \
      label="$MEDIA" \
      drawing=on \
      icon=":spotify:" \
      icon.color=$GREEN
  elif [ "$APP" = "Safari" ]; then
    sketchybar --set $NAME \
      label="$MEDIA" \
      drawing=on \
      icon=":safari:"
  else
    sketchybar --set $NAME \
      label="$MEDIA" \
      drawing=on \
      icon=":music:" \
      icon.color=$MAROON
  fi
else
  sketchybar --set $NAME \
    drawing=off
fi
