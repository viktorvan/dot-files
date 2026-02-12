#!/bin/bash

source "$CONFIG_DIR/variables.sh"

BUSY=${BUSY:-0}
IDLE=${IDLE:-0}
WAITING=${WAITING:-0}

if [ "$BUSY" -gt 0 ]; then
    "$PLUGIN_DIR/orbit_spinner.sh" start &
    IDLE_COLOR="$TEXT"
else
    "$PLUGIN_DIR/orbit_spinner.sh" stop
    if [[ "$IDLE" -gt 0 ]]; then
      IDLE_COLOR="$MAROON"
    else
      IDLE_COLOR="$TEXT"
    fi
fi

if [ "$WAITING" -gt 0 ]; then
    WAITING_COLOR="$MAROON"
else
    WAITING_COLOR="$TEXT"
fi

sketchybar --set orbit_spinner \
           label="$BUSY"

sketchybar --set orbit_idle \
           label="󰒲 $IDLE" \
           label.color="$IDLE_COLOR"

sketchybar --set orbit_waiting \
           label="󱜻" \
           label.color="$WAITING_COLOR"
