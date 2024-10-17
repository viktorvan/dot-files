#!/bin/bash

# loads all defined colors
source "$CONFIG_DIR/variables.sh"

# percentage build
if [ "$SENDER" = "volume_change" ]; then
  VOLUME=$INFO

  case $VOLUME in
  [6-9][0-9] | 100)
    ICON="󰕾"
    ;;
  [3-5][0-9])
    ICON="󰕾"
    ;;
  [1-9] | [1-2][0-9])
    ICON="󰕾"
    ;;
  *) ICON="󰖁" ;;
  esac

  # adding it to sketchybar
  sketchybar --set $NAME \
    icon="$ICON" \
    label="$(printf "%02d" $VOLUME)%"
fi
