#!/usr/bin/env bash

echo "Quitting Karabiner-Elements..."
osascript -e 'quit app "Karabiner-Elements"'

echo "Stopping karabiner_console_user_server..."
launchctl bootout gui/$(id -u)/org.pqrs.service.agent.karabiner_console_user_server 2>/dev/null

while pgrep -f 'karabiner_console_user_server' > /dev/null; do
  sleep 0.5
done
echo "Karabiner stopped"

echo "Starting kanata..."
cd /Users/viktor/dot-files/kanata || exit
sudo ./kanata_macos_arm64 -c config.kbd

echo "Kanata exited, restarting Karabiner-Elements..."
open -a "Karabiner-Elements"
