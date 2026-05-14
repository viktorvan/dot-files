#!/usr/bin/env bash
set -euo pipefail

SERVER_NAME="viktor-dev1"
LOCATION="hel1"
LABEL="remote-dev=viktor-dev1"
TAILSCALE_TAG="tag:devserver"

usage() {
  printf 'Usage: remote-dev-up [--snapshot IMAGE_ID_OR_DESCRIPTION]\n'
}

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    printf 'Missing required environment variable: %s\n' "$name" >&2
    exit 1
  fi
}

snapshot=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --snapshot)
      snapshot="${2:-}"
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

require_env TAILSCALE_API_KEY
require_env TAILSCALE_TAILNET
require_env REMOTE_DEV_PRIMARY_IPV4
require_env REMOTE_DEV_SSH_KEY

printf 'Checking required local commands.\n'

if ! command -v fzf >/dev/null 2>&1; then
  printf 'Missing required command: fzf\n' >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  printf 'Missing required command: jq\n' >&2
  exit 1
fi

if ! command -v hcloud >/dev/null 2>&1; then
  printf 'Missing required command: hcloud\n' >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  printf 'Missing required command: curl\n' >&2
  exit 1
fi

existing_server="$(hcloud server describe "$SERVER_NAME" --output json 2>/dev/null || true)"
if [[ -n "$existing_server" ]]; then
  server_status="$(jq -r '.status' <<<"$existing_server")"

  printf 'Server already exists: %s (status: %s).\n' "$SERVER_NAME" "$server_status"

  if [[ "$server_status" == "off" ]]; then
    printf 'Starting existing server. No new server will be provisioned.\n'
    hcloud server poweron "$SERVER_NAME"
    printf 'Started server: %s\n' "$SERVER_NAME"
  else
    printf 'No new server will be provisioned.\n'
  fi

  exit 0
fi

printf 'Fetching available Regular Performance server types in %s.\n' "$LOCATION"
server_type_line="$(hcloud server-type list --output json \
  | jq -r --arg location "$LOCATION" '
      [.[]
        | select(.cores >= 4 and .cores <= 16)
        | select(.category == "regular_purpose")
        | select(.cpu_type == "shared")
        | select(.architecture == "x86")
        | select(.deprecated == false)
        | select(any(.locations[]; .name == $location and .available == true))
        | {
            name,
            cores,
            memory,
            disk,
            price: (.prices[] | select(.location == $location) | .price_monthly.net)
          }
      ]
      | sort_by(.cores)
      | .[]
      | "\(.name)|\(.cores)|\(.memory)|\(.disk)|\(.price)"
    ' \
  | while IFS='|' read -r name cores memory disk price; do
      printf '%-8s %2s cores  %3s GB RAM  %4s GB disk  €%s/mo\n' "$name" "$cores" "$memory" "$disk" "$price"
    done \
  | fzf --prompt 'Server type: ' --header 'Regular Performance in hel1')"

if [[ -z "$server_type_line" ]]; then
  printf 'No server type selected.\n' >&2
  exit 1
fi

server_type="${server_type_line%% *}"

if [[ -z "$server_type" ]]; then
  printf 'Failed to resolve selected server type.\n' >&2
    exit 1
fi

if [[ -z "$snapshot" ]]; then
  printf 'Selecting latest labeled snapshot for %s.\n' "$LABEL"
  snapshot_info="$(hcloud image list --type snapshot --selector "$LABEL" --output json \
    | jq -r 'sort_by(.created) | reverse | .[0] | select(. != null) | "\(.id)|\(.created)"')"
  snapshot="${snapshot_info%%|*}"
  snapshot_created="${snapshot_info#*|}"

  if [[ -z "$snapshot" ]]; then
    printf 'No labeled snapshots found for %s\n' "$LABEL" >&2
    exit 1
  fi
else
  snapshot_created="$(hcloud image describe "$snapshot" --output json | jq -r '.created // empty')"
fi

if [[ -n "$snapshot_created" && "$snapshot_created" != "$snapshot" ]]; then
  printf 'Using snapshot: %s (created %s)\n' "$snapshot" "$snapshot_created"
else
  printf 'Using snapshot: %s\n' "$snapshot"
fi
printf 'Using server type: %s\n' "$server_type"

printf 'Creating ephemeral Tailscale auth key.\n'
tailscale_response="$(mktemp)"
tailscale_status="$(curl -sS -o "$tailscale_response" -w '%{http_code}' \
  -H "Authorization: Bearer $TAILSCALE_API_KEY" \
  -H 'Content-Type: application/json' \
  --data "$(jq -n --arg tag "$TAILSCALE_TAG" --arg description "$SERVER_NAME-$(TZ=UTC0 date +%Y%m%dT%H%M%SZ)" '{
    capabilities: {
      devices: {
        create: {
          reusable: false,
          ephemeral: true,
          preauthorized: true,
          tags: [$tag]
        }
      }
    },
    expirySeconds: 1800,
    description: $description
  }')" \
  "https://api.tailscale.com/api/v2/tailnet/$TAILSCALE_TAILNET/keys")"

if [[ "$tailscale_status" -lt 200 || "$tailscale_status" -ge 300 ]]; then
  printf 'Failed to create Tailscale auth key. HTTP status: %s\n' "$tailscale_status" >&2
  cat "$tailscale_response" >&2
  printf '\n' >&2
  exit 1
fi

auth_key="$(jq -r '.key' "$tailscale_response")"
rm -f "$tailscale_response"

if [[ -z "$auth_key" || "$auth_key" == "null" ]]; then
  printf 'Failed to create Tailscale auth key.\n' >&2
  exit 1
fi

printf 'Writing temporary cloud-init config.\n'
user_data="$(mktemp)"
trap 'rm -f "$user_data"' EXIT

cat >"$user_data" <<EOF
#cloud-config
package_update: true
runcmd:
  - ['sh', '-c', 'curl -fsSL https://tailscale.com/install.sh | sh']
  - ['tailscale', 'up', '--auth-key=$auth_key', '--hostname=$SERVER_NAME', '--advertise-tags=$TAILSCALE_TAG']
EOF

printf 'Provisioning Hetzner server %s.\n' "$SERVER_NAME"
hcloud server create \
  --name "$SERVER_NAME" \
  --type "$server_type" \
  --image "$snapshot" \
  --location "$LOCATION" \
  --primary-ipv4 "$REMOTE_DEV_PRIMARY_IPV4" \
  --ssh-key "$REMOTE_DEV_SSH_KEY" \
  --label "$LABEL" \
  --user-data-from-file "$user_data"

printf 'Created server: %s\n' "$SERVER_NAME"
