#!/bin/sh
set -eu

HEX="/Applications/Hex.app/Contents/MacOS/hex"

if "$HEX" model list | grep -q '^\* parakeet_unified_en'; then
    MODEL="whisper_large_v3_turbo"
    LANGUAGE="auto"
    LABEL="Whisper (Swedish / Auto)"
else
    MODEL="parakeet_unified_en"
    LANGUAGE="en"
    LABEL="Parakeet (English)"
fi

if "$HEX" model use --language "$LANGUAGE" "$MODEL"; then
    osascript -e "display notification \"$LABEL\" with title \"Hex model switched\""
else
    osascript -e 'display notification "Model switch failed" with title "Hex"'
    exit 1
fi
