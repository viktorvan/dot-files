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
    ICON="󰖀"
    ;;
  [1-9] | [1-2][0-9])
    ICON="󰕿"
    ;;
  *) ICON="󰖁" ;;
  esac

  # adding it to sketchybar
  sketchybar --set $NAME \
    icon="$ICON" \
    label="$VOLUME%" \
    background.drawing=on \
    background.color=$ACCENT_COLOR \
    label.color=$BLACK \
    icon.color=$BLACK
fi
