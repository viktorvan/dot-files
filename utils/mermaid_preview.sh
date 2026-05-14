#!/usr/bin/env bash
set -euo pipefail

input="$(cat)"
diagram="$(echo "$input" | sed -n '/^```mermaid$/,/^```$/p' | sed '1d;$d')"
out="/tmp/mermaid-preview.svg"
echo "$diagram" | mmdr -e svg > "$out" 2>/dev/null
open "$out" >/dev/null 2>&1 || true
echo "$input"
