"""Generate PDFs from markdown files using Playwright (headless Chromium)."""
import os
import markdown
from playwright.sync_api import sync_playwright

PORTFOLIO_DIR = os.path.dirname(os.path.abspath(__file__)) + "/作品集"
FILES = [
    "1-PRD产品需求文档",
    "2-竞品分析",
    "3-数据指标体系",
    "4-AI专项思考",
    "5-项目复盘",
    "6-评测报告",
    "项目经历",
]

CSS = """
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans SC", "Hiragino Sans GB", sans-serif;
  font-size: 14px;
  line-height: 1.8;
  color: #1a1a1a;
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 50px;
}
h1 { font-size: 26px; margin: 30px 0 16px; border-bottom: 2px solid #2563eb; padding-bottom: 8px; }
h2 { font-size: 20px; margin: 26px 0 12px; color: #1e40af; }
h3 { font-size: 16px; margin: 20px 0 10px; color: #333; }
h4 { font-size: 14px; margin: 16px 0 8px; }
p { margin: 8px 0; }
blockquote {
  border-left: 4px solid #2563eb;
  padding: 8px 16px;
  margin: 12px 0;
  background: #f8fafc;
  color: #555;
}
table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 13px; }
th { background: #2563eb; color: white; padding: 8px 12px; text-align: left; font-weight: 600; }
td { padding: 7px 12px; border: 1px solid #e2e8f0; }
tr:nth-child(even) { background: #f8fafc; }
code {
  background: #f1f5f9; padding: 2px 6px; border-radius: 3px;
  font-family: "Cascadia Code", "Fira Code", "Consolas", monospace;
  font-size: 13px;
}
pre {
  background: #1e293b; color: #e2e8f0; padding: 16px 20px;
  border-radius: 8px; overflow-x: auto; margin: 12px 0; font-size: 13px;
  line-height: 1.6;
}
pre code { background: none; padding: 0; color: inherit; }
ul, ol { margin: 8px 0 8px 24px; }
li { margin: 4px 0; }
strong { color: #111; }
hr { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
a { color: #2563eb; text-decoration: none; }
@media print {
  body { padding: 0; }
  @page { margin: 20mm 18mm; }
}
"""


def md_to_html(md_path: str) -> str:
    with open(md_path, "r", encoding="utf-8") as f:
        md_content = f.read()
    body = markdown.markdown(md_content, extensions=["tables", "fenced_code", "codehilite"])
    return f"<!DOCTYPE html><html><head><meta charset='utf-8'><style>{CSS}</style></head><body>{body}</body></html>"


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for name in FILES:
            md_path = os.path.join(PORTFOLIO_DIR, f"{name}.md")
            pdf_path = os.path.join(PORTFOLIO_DIR, f"{name}.pdf")
            if not os.path.exists(md_path):
                print(f"[SKIP] {name}.md not found")
                continue

            html = md_to_html(md_path)
            page = browser.new_page()
            page.set_content(html)
            page.pdf(
                path=pdf_path,
                format="A4",
                margin={"top": "20mm", "bottom": "20mm", "left": "18mm", "right": "18mm"},
                print_background=True,
            )
            page.close()
            print(f"[OK] {name}.pdf")
        browser.close()
    print("Done!")


if __name__ == "__main__":
    main()
