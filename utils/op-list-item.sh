#!/usr/bin/env bash

op signin
name=$(op item list --format=json | jq -r '.[].title' | fzf)
op item get "$name" --reveal --format=json | jq -r '.fields[]|select(.id=="password")|.value' | pbcopy
echo Copied password to clipboard
