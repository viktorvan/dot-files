#!/bin/sh
set -eu

HEX="/Applications/Hex.app/Contents/MacOS/hex"

MODEL=$("$HEX" model list | awk '$1 == "*" { print $2 }')

case "$MODEL" in
    parakeet_unified_en)
        LABEL="Parakeet (English)"
        ;;
    whisper_large_v3_turbo)
        LABEL="Whisper (Swedish / Auto)"
        ;;
    *)
        LABEL="Unknown model: $MODEL"
        ;;
esac

osascript -e "display notification \"$LABEL\" with title \"Hex current model\""
