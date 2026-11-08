#!/bin/bash

FRAMES=("⠋" "⠙" "⠹" "⠸" "⠼" "⠴" "⠦" "⠧" "⠇" "⠏")
INTERVAL=0.2
PID_FILE="$TMPDIR/sketchybar/orbit_status.pid"

start() {
    sketchybar --set orbit_spinner icon.color=$TEXT \
      label.color=$TEXT
    if [ -f "$PID_FILE" ]; then
        if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
            return 0
        fi
        rm -f "$PID_FILE"
    fi

    mkdir -p "$(dirname "$PID_FILE")"

    (
        while true; do
            for frame in "${FRAMES[@]}"; do
                sketchybar --set orbit_spinner icon="$frame"
                sleep "$INTERVAL"
            done
        done
    ) &

    echo $! > "$PID_FILE"
}

stop() {
    if [ -f "$PID_FILE" ]; then
        kill "$(cat "$PID_FILE")" 2>/dev/null
        rm -f "$PID_FILE"
        sleep 0.1
    fi
    pkill -f "orbit_spinner.sh start" 2>/dev/null
    sketchybar --set orbit_spinner icon="⠋" \
      icon.color=$SURFACE1 \
      label.color=$SURFACE1

}

case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    *)
        echo "Usage: $0 {start|stop}"
        exit 1
        ;;
esac
