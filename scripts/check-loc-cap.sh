#!/usr/bin/env bash
# Fails CI if any source file exceeds the 1,500 LoC hard cap from
# docs/AGENTS.md. Run from the repo root: ./scripts/check-loc-cap.sh
#
# Deliberately excludes schema.prisma (declarative, not logic-bearing —
# see the note at the top of that file) and generated/vendor directories.

set -euo pipefail

CAP=1500
VIOLATIONS=0

while IFS= read -r -d '' file; do
  lines=$(wc -l < "$file")
  if [ "$lines" -gt "$CAP" ]; then
    echo "FAIL: $file has $lines lines (cap is $CAP)"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done < <(find . \
  \( -name "*.ts" -o -name "*.tsx" -o -name "*.py" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.next/*" \
  -not -path "*/dist/*" \
  -not -path "*/generated/*" \
  -print0)

if [ "$VIOLATIONS" -gt 0 ]; then
  echo ""
  echo "$VIOLATIONS file(s) exceed the LoC hard cap — split before merging (see docs/AGENTS.md)."
  exit 1
fi

echo "LoC cap check passed — no file exceeds $CAP lines."
