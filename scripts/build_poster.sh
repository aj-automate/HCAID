#!/usr/bin/env bash
# Bouwt poster/poster.pdf (A2) uit poster/poster.html en zet een kopie in de frontend (/poster.pdf).
# Gebruik: scripts/build_poster.sh
set -euo pipefail
cd "$(dirname "$0")/.."
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
PROFILE="$(mktemp -d)"
"$CHROME" --headless=new --disable-gpu --user-data-dir="$PROFILE" --no-pdf-header-footer \
  --virtual-time-budget=5000 --print-to-pdf="poster/poster.pdf" "file://$PWD/poster/poster.html" >/dev/null 2>&1
cp poster/poster.pdf frontend/public/poster.pdf
echo "poster/poster.pdf en frontend/public/poster.pdf bijgewerkt"
