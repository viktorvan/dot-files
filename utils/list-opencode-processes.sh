#!/usr/bin/env bash
# list-opencode-processes.sh

set -euo pipefail

KILL_STALE=0
MATCH_REGEX='opencode --port'

usage() {
  cat <<'EOF'
Usage:
  list-opencode-processes.sh [options]

Default:
  Lists OK, STALE, UNKNOWN opencode processes grouped by status and
  sorted alphabetically by CWD within each group.

Options:
  --kill-stale   Send SIGTERM to STALE processes only
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --kill-stale|-k)
      KILL_STALE=1
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

get_cwd() {
  local pid="$1"
  lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | head -n 1
}

get_cmd() {
  local pid="$1"
  ps -p "$pid" -o command= 2>/dev/null || true
}

# Collect rows as: status<TAB>cwd<TAB>pid<TAB>cmd
rows=()

PIDS="$(pgrep -f "$MATCH_REGEX" || true)"
if [[ -z "$PIDS" ]]; then
  echo "No matching processes found for: $MATCH_REGEX" >&2
  exit 0
fi

while read -r pid; do
  [[ -z "$pid" ]] && continue
  ps -p "$pid" >/dev/null 2>&1 || continue

  cwd="$(get_cwd "$pid")"
  cmd="$(get_cmd "$pid")"

  if [[ -z "$cwd" ]]; then
    status="UNKNOWN"
    cwd_display="(cwd unavailable)"
  elif [[ -d "$cwd" ]]; then
    status="OK"
    cwd_display="$cwd"
  else
    status="STALE"
    cwd_display="$cwd"
  fi

  rows+=("${status}"$'\t'"${pid}"$'\t'"${cwd_display}"$'\t'"${cmd}")
done <<< "$PIDS"

print_group() {
  local group="$1"
  printf "\n=== %s ===\n" "$group"
  printf "%-7s %-7s %-70s %s\n" "STATUS" "PID" "CWD" "CMD"
  printf "%-7s %-7s %-70s %s\n" "------" "---" "--------------------------------------------------------------" "--------------------------"

  printf '%s\n' "${rows[@]}" \
    | awk -F'\t' -v g="$group" '$1==g' \
    | sort -t$'\t' -k3,3 \
    | while IFS=$'\t' read -r status pid cwd cmd; do
        printf "%-7s %-7s %-70s %s\n" "$status" "$pid" "$cwd" "$cmd"

        if [[ "$KILL_STALE" -eq 1 && "$status" == "STALE" ]]; then
          echo "→ kill $pid  ($cwd)" >&2
          kill "$pid" 2>/dev/null || true
        fi
      done
}

print_group "OK"
print_group "STALE"
print_group "UNKNOWN"

exit 0
