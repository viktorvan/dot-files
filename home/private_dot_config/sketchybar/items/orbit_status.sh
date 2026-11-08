#!/bin/bash

source "$CONFIG_DIR/colors.sh"

sketchybar --add event orbit_status
sketchybar --add event orbit_notify


sketchybar --add item orbit_waiting q \
  --set orbit_waiting update_freq=600 \
  label="󱜻" \
  label.width=20 \
  icon.width=0 \
  background.border_width=0 \
  background.drawing=off \
  --subscribe orbit_waiting orbit_status

sketchybar --add item orbit_idle q \
  --set orbit_idle update_freq=600 \
  label="󰒲" \
  label.width=35 \
  icon.width=0 \
  background.border_width=0 \
  background.drawing=off \
  --subscribe orbit_idle orbit_status

sketchybar --add item orbit_spinner q \
  --set orbit_spinner update_freq=600 \
  script="$PLUGIN_DIR/orbit_status.sh" \
  icon="⠋" \
  icon.color=$SURFACE1 \
  icon.width=20 \
  icon.padding_left=6 \
  icon.padding_right=4 \
  label="" \
  label.width=15 \
  popup.align=left \
  popup.height=40 \
  popup.background.color=$BASE \
  popup.background.corner_radius=5 \
  popup.background.border_width=1 \
  popup.background.border_color=$MAROON \
  background.border_width=0 \
  background.drawing=off \
  --subscribe orbit_spinner orbit_status

sketchybar --add bracket orbit_group orbit_spinner orbit_idle orbit_waiting \
  --set orbit_group background.color=$BASE \
                    background.border_width=1 \
                    background.border_color=$SKY \
                    background.corner_radius=10

sketchybar --add item orbit_notify_popup popup.orbit_spinner \
  --set orbit_notify_popup icon="" \
  icon.color=$TEXT \
  label="" \
  label.color=$TEXT \
  background.drawing=off \
  background.border_width=0 \
  background.padding_left=10 \
  background.padding_right=10 \
  script="$PLUGIN_DIR/orbit_notify.sh" \
  --subscribe orbit_notify_popup orbit_notify

"$PLUGIN_DIR/orbit_spinner.sh" stop
