#!/usr/bin/env bash
set -euo pipefail

LABEL="remote-dev=viktor-dev1"

require_command() {
  local command_name="$1"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$command_name" >&2
    exit 1
  fi
}

format_age() {
  local seconds="$1"
  local suffix="ago"

  if (( seconds < 0 )); then
    seconds=$((seconds * -1))
    suffix="from now"
  fi

  if (( seconds < 60 )); then
    printf '%ss %s' "$seconds" "$suffix"
  elif (( seconds < 3600 )); then
    printf '%smin %s' "$((seconds / 60))" "$suffix"
  elif (( seconds < 86400 )); then
    printf '%sh %s' "$((seconds / 3600))" "$suffix"
  else
    printf '%sd %s' "$((seconds / 86400))" "$suffix"
  fi
}

require_command fzf
require_command hcloud
require_command jq

snapshots_json="$(hcloud image list --type snapshot --selector "$LABEL" --output json)"
now_epoch="$(date +%s)"

if [[ "$(jq 'length' <<<"$snapshots_json")" -eq 0 ]]; then
  printf 'No snapshots found for %s.\n' "$LABEL"
  exit 0
fi

rows="$(jq -r '
  sort_by(.created)
  | reverse
  | .[]
  | [
      .id,
      .created,
      .status,
      .description
    ]
  | @tsv
' <<<"$snapshots_json" \
  | while IFS=$'\t' read -r id created status description; do
      created_epoch="$(date -j -u -f '%Y-%m-%dT%H:%M:%SZ' "$created" '+%s')"
      age_seconds=$((now_epoch - created_epoch))
      printf '%-12s %-24s %-13s %-11s %s\n' "$id" "$created" "$(format_age "$age_seconds")" "$status" "$description"
    done)"

selection="$(printf '%s\n' "$rows" \
  | fzf \
      --multi \
      --prompt 'snapshots> ' \
      --header 'Select snapshots to delete with Tab, then Enter')"

if [[ -z "$selection" ]]; then
  printf 'No snapshots selected.\n'
  exit 0
fi

printf 'Snapshots selected for deletion:\n%s\n\n' "$selection"
read -r -p 'Delete selected snapshots? [y/N] ' confirm

case "$confirm" in
  y|Y|yes|YES)
    ;;
  *)
    printf 'Aborted. No snapshots deleted.\n'
    exit 0
    ;;
esac

while IFS= read -r line; do
  snapshot_id="${line%% *}"

  if [[ -z "$snapshot_id" ]]; then
    continue
  fi

  printf 'Deleting snapshot: %s\n' "$snapshot_id"
  hcloud image delete "$snapshot_id"
done <<<"$selection"

printf 'Deleted selected snapshots.\n'
