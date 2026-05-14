#!/usr/bin/env bash
set -euo pipefail

SERVER_NAME="viktor-dev1"
LABEL="remote-dev=viktor-dev1"

usage() {
  printf 'Usage: remote-dev-stop-and-snapshot [--description DESCRIPTION]\n'
}

description="remote-dev-viktor-dev1-$(TZ=UTC0 date +%Y%m%dT%H%M%SZ)"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --description)
      description="${2:-}"
      shift 2
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

hcloud server describe "$SERVER_NAME" >/dev/null

printf 'Shutting down %s gracefully.\n' "$SERVER_NAME"
hcloud server shutdown --wait --wait-timeout 10m "$SERVER_NAME"

printf 'Creating snapshot: %s\n' "$description"
hcloud server create-image --type snapshot --description "$description" --label "$LABEL" "$SERVER_NAME"

snapshot_id=""
for _ in {1..120}; do
  snapshot_id="$(hcloud image list --type snapshot --selector "$LABEL" --output json \
    | jq -r --arg description "$description" '.[] | select(.description == $description and .status == "available") | .id' \
    | head -n 1)"

  if [[ -n "$snapshot_id" ]]; then
    break
  fi

  sleep 5
done

if [[ -z "$snapshot_id" ]]; then
  printf 'Snapshot was not verified as available: %s\n' "$description" >&2
  exit 1
fi

printf 'Snapshot verified: %s (%s)\n' "$snapshot_id" "$description"
printf 'Server remains stopped. Run remote-dev-delete after you verify the snapshot list.\n'
