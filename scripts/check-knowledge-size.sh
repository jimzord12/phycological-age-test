#!/usr/bin/env bash
#
# Checks the size of KNOWLEDGE.md against the distill threshold.
#
# Run this AFTER adding a record to KNOWLEDGE.md (and only then) — see AGENTS.md §6.
# If the file is over the threshold, add a note at the top of docs/Handoff.md telling the
# next agent to compress and distill KNOWLEDGE.md before doing anything else.
#
# Usage: bash scripts/check-knowledge-size.sh [path-to-file]
set -euo pipefail

FILE="${1:-KNOWLEDGE.md}"
THRESHOLD_KB=150

if [[ ! -f "$FILE" ]]; then
  echo "check-knowledge-size: '$FILE' not found." >&2
  exit 0
fi

bytes=$(wc -c < "$FILE" | tr -d '[:space:]')
kb=$(( bytes / 1024 ))

echo "KNOWLEDGE.md: ${kb} KB (${bytes} bytes) — threshold ${THRESHOLD_KB} KB"

if (( kb > THRESHOLD_KB )); then
  echo "" >&2
  echo "OVER THRESHOLD (${kb} KB > ${THRESHOLD_KB} KB)." >&2
  echo "ACTION: add a note at the top of docs/Handoff.md instructing the next agent to" >&2
  echo "compress and distill KNOWLEDGE.md as their first action." >&2
  exit 1
fi

echo "OK: under threshold."
exit 0
