#!/bin/sh
set -eu

case "${1:-}" in
  left) key=m ;;
  down) key=n ;;
  up) key=e ;;
  right) key=i ;;
  *) exit 2 ;;
esac

herdr=${HERDR_BIN_PATH:-herdr}
pane=${HERDR_ACTIVE_PANE_ID:?Herdr must supply the active pane}
processes=$("$herdr" pane process-info --pane "$pane")

forward=$(printf '%s\n' "$processes" | jq -r '
  any(.result.process_info.foreground_processes[];
    .name | test("^(nvim|tmux)( |:|$)"))
')
if [ "$forward" = true ]; then
  exec "$herdr" pane send-keys "$pane" "alt+$key"
fi

exec "$herdr" pane focus --pane "$pane" --direction "$1"
