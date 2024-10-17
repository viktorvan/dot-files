#!/bin/sh

source "$CONFIG_DIR/variables.sh"
sketchybar --add event aerospace_workspace_change
focused=$(aerospace list-workspaces --focused)

for sid in $(aerospace list-workspaces --all); do
  sketchybar --add item space.$sid left \
    --subscribe space.$sid aerospace_workspace_change \
    --set space.$sid icon.font="Berkeley Mono Variable:Regular:15.0" \
    icon=$sid \
    icon.align=left \
    icon.width=24 \
    icon.align=center \
    icon.padding_left=0 \
    icon.padding_right=0 \
    icon.background.color=$PEACH \
    icon.background.drawing=off \
    icon.background.height=24 \
    icon.background.border_color=$LAVENDER \
    icon.background.border_width=0 \
    icon.background.corner_radius=24 \
    label.drawing=off \
    background.padding_left=4 \
    background.padding_right=4 \
    background.drawing=off \
    script="$PLUGIN_DIR/space.sh $sid"
  if [ "$focused" = "$sid" ]; then
    sketchybar --set space.$sid \
      icon.background.drawing=on \
      icon.color=$CRUST
  fi
done

# consolidate space numbers and add a background
sketchybar --add bracket spaces '/space\..*/' \
  --set spaces background.color=$BASE \
  blur_radius=2 \
  background.padding_left=0 \
  background.height=30
