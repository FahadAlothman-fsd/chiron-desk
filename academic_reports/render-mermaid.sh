#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="$ROOT_DIR/academic_reports/mermaid"
OUT_DIR="$ROOT_DIR/academic_reports/figures"
CONFIG_FILE="$SRC_DIR/config.json"
PUPPETEER_CONFIG_FILE="$SRC_DIR/puppeteer-config.json"

if ! command -v npx >/dev/null 2>&1; then
  printf "Missing required command: npx\n" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

for source in "$SRC_DIR"/*.mmd; do
  [ -e "$source" ] || continue
  base_name="$(basename "$source" .mmd)"
  svg_output="$OUT_DIR/$base_name.svg"
  png_output="$OUT_DIR/$base_name.png"
  npx -y @mermaid-js/mermaid-cli \
    -i "$source" \
    -o "$svg_output" \
    -c "$CONFIG_FILE" \
    -p "$PUPPETEER_CONFIG_FILE" \
    -t neutral \
    -b white
  npx -y @mermaid-js/mermaid-cli \
    -i "$source" \
    -o "$png_output" \
    -c "$CONFIG_FILE" \
    -p "$PUPPETEER_CONFIG_FILE" \
    -t neutral \
    -b white
done

printf "Rendered Mermaid figures to academic_reports/figures\n"
