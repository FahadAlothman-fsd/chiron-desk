from __future__ import annotations

from pathlib import Path
import re
import subprocess
import markdown


BASE_DIR = Path(__file__).resolve().parent
LOGO_FILE = BASE_DIR / "kfupm-logo-green.png"

STUDENT_NAME = "Fahad Alothman"
STUDENT_ID = "201673400"
PROJECT_NAME = "Chiron"
PROJECT_CODE = "MX_PROJECT"


CSS = """
@page { size: A4; margin: 16mm 14mm 16mm 14mm; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
  line-height: 1.6;
  color: #141414;
  margin: 0;
  background: #ffffff;
}

.cover-page {
  min-height: 94vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 22px 20px;
  page-break-after: always;
}

.cover-logo {
  width: 180px;
  max-width: 44%;
  margin-bottom: 14px;
}

.cover-title {
  font-size: 50px;
  font-weight: 800;
  line-height: 1.1;
  max-width: 980px;
  color: #6b6150;
  margin: 0 0 10px;
}

.cover-subtitle {
  font-size: 22px;
  line-height: 1.28;
  max-width: 900px;
  color: #6b6150;
  margin: 0 0 10px;
  font-weight: 700;
}

.cover-meta {
  font-size: 15px;
  color: #6b6150;
  max-width: 880px;
  margin: 4px auto;
}

.cover-student {
  margin-top: 22px;
  font-size: 18px;
  color: #00796b;
  font-weight: 500;
}

.report-body {
  background: #ffffff;
  max-width: 980px;
  margin: 8px auto;
  padding: 14px 24px 28px;
}

h1, h2, h3 { line-height: 1.25; }
h1 { font-size: 2rem; margin-bottom: 0.6rem; }
h2 { font-size: 1.35rem; margin-top: 2rem; }
h3 { font-size: 1.1rem; margin-top: 1.25rem; }
hr { border: none; border-top: 1px solid #ddd; margin: 1.5rem 0; }
code { background: #f6f8fa; padding: 0.1em 0.3em; border-radius: 4px; }
pre { background: #f6f8fa; padding: 12px; overflow-x: auto; border-radius: 8px; }
a { color: #0b57d0; text-decoration: underline; word-break: break-word; }
ul, ol { padding-left: 1.2rem; }

@media print {
  body { background: #fff; }
  .report-body { margin: 0; max-width: none; padding: 0; }
  .cover-page { min-height: 94vh; }
}
"""


def extract_meta(md_text: str) -> dict[str, str]:
  heading_match = re.search(r"^#\s+(.+)$", md_text, flags=re.MULTILINE)
  title_match = re.search(r"\*\*Title:\*\*\s*(.+?)\s{2,}$", md_text, flags=re.MULTILINE)
  window_match = re.search(r"\*\*Reporting Window:\*\*\s*(.+?)\s{2,}$", md_text, flags=re.MULTILINE)
  context_match = re.search(r"\*\*Submission Context:\*\*\s*(.+?)\s*$", md_text, flags=re.MULTILINE)

  return {
    "report_heading": heading_match.group(1).strip() if heading_match else "Progress Report",
    "report_title": title_match.group(1).strip() if title_match else "",
    "report_window": window_match.group(1).strip() if window_match else "",
    "report_context": context_match.group(1).strip() if context_match else "",
  }


def autolink_text(md_text: str) -> str:
  url_pattern = re.compile(r"(?<![\(\"\'=])(https?://[^\s<>)]+)")
  return url_pattern.sub(r"<\1>", md_text)


def build_cover_html(meta: dict[str, str]) -> str:
  subtitle = meta["report_title"]
  window = meta["report_window"]
  context = meta["report_context"]

  return f"""
<section class=\"cover-page\">
  <img class=\"cover-logo\" src=\"{LOGO_FILE.name}\" alt=\"KFUPM Logo\" />
  <div class=\"cover-title\">{PROJECT_NAME}</div>
  <div class=\"cover-subtitle\">{subtitle}</div>
  <div class=\"cover-meta\">{meta['report_heading']} • {window}</div>
  <div class=\"cover-meta\">{context}</div>
  <div class=\"cover-student\">{STUDENT_NAME}</div>
</section>
"""


def output_stem_for(md_path: Path) -> str:
  match = re.match(r"^PROGRESS_REPORT_(\d+)_", md_path.stem)
  if not match:
    raise ValueError(f"Unexpected report filename: {md_path.name}")
  number = int(match.group(1))
  return f"PROGRESS_REPORT_{number:02d}_{STUDENT_ID}_{PROJECT_CODE}"


def render_html(md_path: Path, output_stem: str) -> Path:
  md_text = md_path.read_text(encoding="utf-8")
  meta = extract_meta(md_text)
  linked = autolink_text(md_text)
  body_html = markdown.markdown(linked, extensions=["extra", "sane_lists"])
  document_title = meta["report_heading"]

  html = f"""<!doctype html>
<html lang=\"en\">
<head>
  <meta charset=\"utf-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
  <title>{document_title}</title>
  <style>{CSS}</style>
</head>
<body>
  {build_cover_html(meta)}
  <main class=\"report-body\">
    {body_html}
  </main>
</body>
</html>
"""

  html_path = md_path.with_name(f"{output_stem}.html")
  html_path.write_text(html, encoding="utf-8")
  return html_path


def render_pdf(html_path: Path) -> Path:
  pdf_path = html_path.with_suffix(".pdf")
  if pdf_path.exists():
    pdf_path.unlink()

  subprocess.run(
    [
      "google-chrome",
      "--headless=new",
      "--disable-gpu",
      "--no-pdf-header-footer",
      f"--print-to-pdf={pdf_path}",
      html_path.as_uri(),
    ],
    check=True,
    cwd=str(BASE_DIR),
  )
  return pdf_path


def main() -> None:
  if not LOGO_FILE.exists():
    raise FileNotFoundError(f"Logo file not found: {LOGO_FILE}")

  report_files = sorted(BASE_DIR.glob("PROGRESS_REPORT_*.md"))
  for md_file in report_files:
    old_html = md_file.with_suffix(".html")
    old_pdf = md_file.with_suffix(".pdf")
    if old_html.exists():
      old_html.unlink()
    if old_pdf.exists():
      old_pdf.unlink()

    out_stem = output_stem_for(md_file)
    html_file = render_html(md_file, out_stem)
    render_pdf(html_file)

  print(f"Generated HTML + PDF for {len(report_files)} progress reports.")


if __name__ == "__main__":
  main()
