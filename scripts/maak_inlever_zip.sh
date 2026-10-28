#!/usr/bin/env bash
# Maakt het inleverpakket voor Brightspace: broncode + URL's + poster.
# Gebruik: scripts/maak_inlever_zip.sh
set -euo pipefail
cd "$(dirname "$0")/.."
NAME="HCAID-Kredietrisico-broncode"
OUT="inleveren"
mkdir -p "$OUT"
# Alleen bestanden die in git staan (dus geen node_modules, .venv, builds of feedback).
git archive --format=zip --prefix="$NAME/" -o "$OUT/$NAME.zip" HEAD
cp poster/poster.pdf "$OUT/HCAID-Kredietrisico-poster.pdf"
cp INLEVEREN.md "$OUT/LEESMIJ-inleveren.md"
echo "Klaar:"
ls -lh "$OUT"
