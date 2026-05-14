#!/usr/bin/env bash
set -euo pipefail

LABEL="remote-dev=viktor-dev1"

hcloud image list \
  --type snapshot \
  --selector "$LABEL" \
  --sort created:desc \
  --output columns=id,description,status,created,architecture,disk_size
