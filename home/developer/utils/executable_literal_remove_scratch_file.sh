#!/usr/bin/env bash
folder="${XDG_DATA_HOME:-$HOME/.local/share}/nvim/scratch"

find "$folder" -type f | fzf --preview 'head -n 10 {}' | xargs rm -- 
