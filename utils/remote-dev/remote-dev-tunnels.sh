#!/usr/bin/env bash
set -euo pipefail

DEFAULT_HOST="devserver"
DEFAULT_PORTS=(5001 7240 7023 3000 4000 5000)

usage() {
  cat <<'EOF'
Usage: remote-dev-tunnels [--host SSH_HOST] [--port PORT]

Start SSH tunnels from local localhost ports to the remote dev server.

Options:
  --host SSH_HOST  SSH host alias to connect to. Defaults to devserver.
  --port PORT      Port to forward. Can be provided multiple times.
  -h, --help       Show this help.
EOF
}

require_command() {
  local command_name="$1"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$command_name" >&2
    exit 1
  fi
}

validate_port() {
  local port="$1"

  if [[ ! "$port" =~ ^[0-9]+$ ]] || ((port < 1 || port > 65535)); then
    printf 'Invalid port: %s\n' "$port" >&2
    exit 1
  fi
}

host="$DEFAULT_HOST"
ports=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host)
      if [[ $# -lt 2 ]]; then
        printf 'Missing value for --host.\n' >&2
        exit 1
      fi

      host="${2:-}"
      shift 2
      ;;
    --port)
      if [[ $# -lt 2 ]]; then
        printf 'Missing value for --port.\n' >&2
        exit 1
      fi

      port="${2:-}"
      validate_port "$port"
      ports+=("$port")
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

if [[ -z "$host" ]]; then
  printf 'Missing SSH host.\n' >&2
  exit 1
fi

if [[ ${#ports[@]} -eq 0 ]]; then
  ports=("${DEFAULT_PORTS[@]}")
fi

require_command ssh

ssh_args=(
  -T
  -N
  -o RequestTTY=no
  -o RemoteCommand=none
  -o ExitOnForwardFailure=yes
  -o ServerAliveInterval=30
  -o ServerAliveCountMax=3
)

printf 'Starting SSH tunnels to %s. Press Ctrl-C to stop.\n' "$host"
printf 'Forwarded ports:\n'

for port in "${ports[@]}"; do
  printf '  localhost:%s -> %s:%s\n' "$port" "$host" "$port"
  ssh_args+=(
    -L "127.0.0.1:${port}:127.0.0.1:${port}"
  )
done

exec ssh "${ssh_args[@]}" "$host"
