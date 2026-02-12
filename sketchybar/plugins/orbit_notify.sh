#!/bin/bash

TITLE=""
MESSAGE=""

if [ -n "$TITLE_B64" ]; then
    TITLE=$(echo "$TITLE_B64" | base64 -d 2>/dev/null || echo "Notification")
else
    TITLE=""
fi

if [ -n "$MESSAGE_B64" ]; then
    MESSAGE=$(echo "$MESSAGE_B64" | base64 -d 2>/dev/null || echo "")
else
    MESSAGE=""
fi

NOTIFICATION_TEXT="$TITLE: $MESSAGE"

sketchybar --set orbit_notify_popup label="$NOTIFICATION_TEXT"

if [ -n "$TITLE_B64" ]; then
  sketchybar --set orbit_spinner popup.drawing=on
  (sleep 3 && sketchybar --set orbit_spinner popup.drawing=off) &
else
  sketchybar --set orbit_spinner popup.drawing=off
fi
