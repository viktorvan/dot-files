#!/usr/bin/env bash
set -euo pipefail

SERVER_NAME="viktor-dev1"
TAILSCALE_HOSTNAME="viktor-dev1.tailed9a10.ts.net"
LABEL="remote-dev=viktor-dev1"
MAX_SNAPSHOT_AGE_SECONDS=$((4 * 60 * 60))

usage() {
  printf 'Usage: remote-dev-delete [--force]\n'
}

format_age() {
  local seconds="$1"

  if (( seconds < 60 )); then
    printf '%s seconds ago' "$seconds"
  elif (( seconds < 3600 )); then
    printf '%s minutes ago' "$((seconds / 60))"
  elif (( seconds < 86400 )); then
    printf '%s hours ago' "$((seconds / 3600))"
  else
    printf '%s days ago' "$((seconds / 86400))"
  fi
}

force="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force)
      force="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage >&2
      exit 1
      ;;
  esac
done

server_json="$(hcloud server describe "$SERVER_NAME" --output json 2>/dev/null || true)"
if [[ -z "$server_json" ]]; then
  printf 'Server does not exist: %s\n' "$SERVER_NAME"
  exit 0
fi

server_status="$(jq -r '.status' <<<"$server_json")"
if [[ "$server_status" != "off" ]]; then
  printf 'Refusing to delete %s because it is not stopped. Current status: %s\n' "$SERVER_NAME" "$server_status" >&2
  printf 'Run remote-dev-stop-and-snapshot first.\n' >&2
  exit 1
fi

latest_snapshot="$(hcloud image list --type snapshot --selector "$LABEL" --output json \
  | jq -r 'sort_by(.created) | reverse | .[0] | select(. != null) | "\(.id)|\(.description)|\(.created)|\(.status)"')"

if [[ -z "$latest_snapshot" ]]; then
  printf 'Refusing to delete %s because no labeled snapshot exists for %s.\n' "$SERVER_NAME" "$LABEL" >&2
  exit 1
fi

IFS='|' read -r snapshot_id snapshot_description snapshot_created snapshot_status <<<"$latest_snapshot"

if [[ "$snapshot_status" != "available" ]]; then
  printf 'Refusing to delete %s because latest snapshot is not available.\n' "$SERVER_NAME" >&2
  printf 'Latest snapshot: %s (%s), status: %s, created: %s\n' "$snapshot_id" "$snapshot_description" "$snapshot_status" "$snapshot_created" >&2
  exit 1
fi

snapshot_created_epoch="$(date -j -u -f '%Y-%m-%dT%H:%M:%SZ' "$snapshot_created" '+%s')"
snapshot_age_seconds=$(($(date '+%s') - snapshot_created_epoch))
snapshot_age="$(format_age "$snapshot_age_seconds")"
if (( snapshot_age_seconds > MAX_SNAPSHOT_AGE_SECONDS )) && [[ "$force" != "true" ]]; then
  printf 'Refusing to delete %s because latest snapshot is older than 4 hours.\n' "$SERVER_NAME" >&2
  printf 'Latest snapshot: %s (%s), created %s\n' "$snapshot_id" "$snapshot_description" "$snapshot_age" >&2
  printf 'Run remote-dev-delete --force to delete anyway.\n' >&2
  exit 1
fi

printf 'Server is stopped: %s\n' "$SERVER_NAME"
printf 'Latest verified snapshot: %s (%s), created %s\n' "$snapshot_id" "$snapshot_description" "$snapshot_age"

hcloud server delete "$SERVER_NAME"
printf 'Deleted server: %s\n' "$SERVER_NAME"

printf 'Removing local SSH known-host entries for %s and %s.\n' "$SERVER_NAME" "$TAILSCALE_HOSTNAME"
ssh-keygen -R "$SERVER_NAME" >/dev/null 2>&1 || true
ssh-keygen -R "$TAILSCALE_HOSTNAME" >/dev/null 2>&1 || true
