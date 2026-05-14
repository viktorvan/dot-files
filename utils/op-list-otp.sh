#!/usr/bin/env bash

op signin
name=$(op item list --format=json | jq -r '.[].title' | fzf)
op item get "$name" --reveal --format=json | jq -r '.fields[]|select(.type=="OTP")|.totp' | pbcopy
echo Copied otp to clipboard
