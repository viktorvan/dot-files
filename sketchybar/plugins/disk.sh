#!/bin/bash

# loads all defined colors
source "$CONFIG_DIR/variables.sh"

# Get disk space information
DISK_INFO=$(df -h /System/Volumes/Data | grep -v Filesystem)
TOTAL_SPACE=$(echo "$DISK_INFO" | awk '{print $2}')
FREE_SPACE=$(echo "$DISK_INFO" | awk '{print $4}')
CAPACITY=$(echo "$DISK_INFO" | awk '{print $5}' | sed 's/%//')

# Set color based on free space percentage
if [ $(echo "$FREE_SPACE" | sed 's/Gi//') -le "15" ]; then
  sketchybar --set $NAME \
    icon="" \
    icon.color=$MAROON \
    label.color=$MAROON \
    label="${FREE_SPACE}/${TOTAL_SPACE}"
else
  # Normal state
  sketchybar --set $NAME \
    icon="" \
    icon.color=$TEXT \
    label.color=$TEXT \
    label="${FREE_SPACE}/${TOTAL_SPACE}"
fi
