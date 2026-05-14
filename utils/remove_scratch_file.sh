#!/usr/bin/env bash
folder="/Users/viktor/.local/share/nvim/scratch"

find "$folder" -type f | fzf --preview 'head -n 10 {}' | xargs rm -- 
