#!/usr/bin/env bash
set -euo pipefail

LABEL="remote-dev=viktor-dev1"

hcloud server list \
  --selector "$LABEL" \
  --sort name \
  --output columns=id,name,status,type,location,ipv4,created
