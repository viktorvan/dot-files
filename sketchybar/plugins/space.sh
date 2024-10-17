#!/bin/bash

# loads all defined colors
source "$CONFIG_DIR/variables.sh"

if [ "$SENDER" = "aerospace_workspace_change" ]; then

  if [ "$1" = "$FOCUSED_WORKSPACE" ]; then
    sketchybar --set space.$1 \
      icon.background.drawing=on \
      icon.color=$CRUST
  else
    sketchybar --set space.$1 \
      icon.background.drawing=off \
      icon.color=$TEXT
  fi

# elif [ "$SENDER" = "front_app_switched" ]; then
#
#   #SET WORKSPACE APPS
#   apps=$(aerospace list-windows --workspace "$1" | awk -F'|' '{gsub(/^ *| *$/, "", $2); print $2}')
#
#   icon_strip=" "
#   if [ "${apps}" != "" ]; then
#     while read -r app; do
#       icon_strip+=" $($CONFIG_DIR/plugins/icon_map_fn.sh "$app")"
#     done <<<"${apps}"
#   else
#     icon_strip=" —"
#   fi
#
#   sketchybar --set space.$1 label="$icon_strip"

fi
