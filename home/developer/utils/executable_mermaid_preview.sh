#!/usr/bin/env bash
set -euo pipefail

input="$(cat)"
diagram="$(echo "$input" | sed -n '/^```mermaid$/,/^```$/p' | sed '1d;$d')"
out="/tmp/mermaid-preview.svg"
echo "$diagram" | mmdr -e svg > "$out" 2>/dev/null
case "$(uname -s)" in
  Darwin) open "$out" >/dev/null 2>&1 || true ;;
  Linux) if command -v xdg-open >/dev/null 2>&1; then xdg-open "$out" >/dev/null 2>&1 || true; fi ;;
esac
echo "$input"
