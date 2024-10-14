#!/bin/bash

# loads all defined colors
source "$CONFIG_DIR/variables.sh"

if [ "$SENDER" = "aerospace_workspace_change" ]; then

  # SET FOCUSED WORKSPACE BACKGROUND
  if [ "$1" = "$FOCUSED_WORKSPACE" ]; then
    sketchybar --set $NAME background.drawing=on \
      background.color=$ACCENT_COLOR \
      label.color=$BLACK \
      icon.color=$BLACK
  else
    sketchybar --set $NAME background.drawing=off \
      label.color=$TEXT \
      icon.color=$TEXT
  fi

  # SET FOCUSED WORKSPACE APPS
  apps=$(aerospace list-windows --workspace "$FOCUSED_WORKSPACE" | awk -F'|' '{gsub(/^ *| *$/, "", $2); print $2}')

  icon_strip=" "
  if [ "${apps}" != "" ]; then
    while read -r app; do
      icon_strip+=" $($CONFIG_DIR/plugins/icon_map_fn.sh "$app")"
    done <<<"${apps}"
  else
    icon_strip=" —"
  fi

  sketchybar --set space.$FOCUSED_WORKSPACE label="$icon_strip"

else
  # SET WORKSPACE APPS
  apps=$(aerospace list-windows --workspace "$1" | awk -F'|' '{gsub(/^ *| *$/, "", $2); print $2}')

  icon_strip=" "
  if [ "${apps}" != "" ]; then
    while read -r app; do
      icon_strip+=" $($CONFIG_DIR/plugins/icon_map_fn.sh "$app")"
    done <<<"${apps}"
  else
    icon_strip=" —"
  fi

  sketchybar --set space.$1 label="$icon_strip"
fi
