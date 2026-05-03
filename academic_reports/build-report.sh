#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULTS_FILE="$ROOT_DIR/academic_reports/pandoc/report-defaults.yaml"
REPORT_FILE="$ROOT_DIR/academic_reports/report.md"
export PATH="$ROOT_DIR/.local/bin:$PATH"

MODE="${1:-pdf}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf "Missing required command: %s\n" "$1" >&2
    return 1
  fi
}

ensure_pandoc() {
  require_command pandoc || {
    cat >&2 <<'EOF'
Pandoc is required to build the submission report.

Suggested install options:
  Ubuntu/Debian: sudo apt-get install pandoc
  macOS (Homebrew): brew install pandoc
  Arch: sudo pacman -S pandoc

After installing Pandoc, rerun:
  bash academic_reports/build-report.sh pdf
EOF
    exit 1
  }
}

render_mermaid() {
  bash "$ROOT_DIR/academic_reports/render-mermaid.sh"
}

ensure_pdf_engine() {
  if command -v xelatex >/dev/null 2>&1; then
    printf 'xelatex'
    return 0
  fi

  if command -v tectonic >/dev/null 2>&1; then
    printf 'tectonic'
    return 0
  fi

  cat >&2 <<'EOF'
No supported PDF engine was found.

Install one of the following:
  XeLaTeX: sudo apt-get install texlive-xetex
  Tectonic: https://tectonic-typesetting.github.io/

You can still export preview formats with:
  bash academic_reports/build-report.sh html
  bash academic_reports/build-report.sh docx
EOF
  exit 1
}

build_pdf() {
  render_mermaid
  ensure_pandoc
  PDF_ENGINE="$(ensure_pdf_engine)"
  (cd "$ROOT_DIR" && pandoc --defaults "$DEFAULTS_FILE" --pdf-engine="$PDF_ENGINE")
  printf "Created academic_reports/report.pdf\n"
}

build_html() {
  render_mermaid
  ensure_pandoc
  (cd "$ROOT_DIR" && pandoc "$REPORT_FILE" -s -o academic_reports/report.html --toc)
  printf "Created academic_reports/report.html\n"
}

build_docx() {
  render_mermaid
  ensure_pandoc
  (cd "$ROOT_DIR" && pandoc "$REPORT_FILE" -s -o academic_reports/report.docx --toc)
  printf "Created academic_reports/report.docx\n"
}

case "$MODE" in
  pdf)
    build_pdf
    ;;
  html)
    build_html
    ;;
  docx)
    build_docx
    ;;
  *)
    cat >&2 <<'EOF'
Usage:
  bash academic_reports/build-report.sh pdf
  bash academic_reports/build-report.sh html
  bash academic_reports/build-report.sh docx
EOF
    exit 1
    ;;
esac
