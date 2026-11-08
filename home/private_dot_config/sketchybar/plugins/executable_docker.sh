#!/bin/bash

# loads all defined colors
source "$CONFIG_DIR/variables.sh"

# percentage build
projects=$(/usr/local/bin/docker ps --filter "label=com.docker.compose.project" -q | xargs /usr/local/bin/docker inspect --format='{{index .Config.Labels "com.docker.compose.project"}}' | sort | uniq)
projects_string=${projects//$'\n'/\/}

if [ -n "$projects_string" ]; then
  sketchybar --set docker label="$projects_string" \
    drawing=on
else
  sketchybar --set docker label="$projects_string" \
    drawing=off
fi
