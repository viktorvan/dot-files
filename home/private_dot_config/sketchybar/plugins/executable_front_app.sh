#!/bin/bash

# listen to front_app_switched event and set current app on bar
if [ "$SENDER" = "front_app_switched" ]; then
  sketchybar --set $NAME label="$INFO" icon="$($CONFIG_DIR/plugins/icon_map_fn.sh "$INFO")"
fi

# for more events, see: https://felixkratz.github.io/SketchyBar/config/events#events-and-scripting
