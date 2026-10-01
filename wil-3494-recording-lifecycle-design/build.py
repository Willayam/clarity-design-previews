import html, markdown, pathlib
here = pathlib.Path(__file__).parent
root = here.parent
design = (root / 'design.md').read_text()
sketch = (root / 'sketch.ts').read_text()
summary = (here / 'summary.md').read_text()
import re
def spaced_lists(text):
    out, prev = [], ''
    in_code = False
    for line in text.split('\n'):
        if line.startswith('```'):
            in_code = not in_code
        is_item = bool(re.match(r'^(\s*)([-*]|\d+\.)\s', line))
        prev_item = bool(re.match(r'^(\s*)([-*]|\d+\.)\s', prev))
        if not in_code and is_item and prev.strip() and not prev_item and not prev.startswith('|'):
            out.append('')
        out.append(line)
        prev = line
    return '\n'.join(out)
design = spaced_lists(design)
summary = spaced_lists(summary)
md = markdown.Markdown(extensions=['tables', 'fenced_code', 'toc', 'sane_lists'])
body_summary = md.convert(summary)
md.reset()
body_design = md.convert(design)
toc = md.toc
page = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>WIL-3494 design: server-owned recording lifecycle</title>
<style>
body{{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:20px;background:#f6f7f9;color:#111;line-height:1.5}}
main{{max-width:1100px;margin:0 auto}}
section.card{{background:#fff;border:1px solid #e3e5e8;border-radius:10px;padding:16px 20px;margin:0 0 18px}}
section.signoff{{border-color:#c7d7fe;background:#f5f8ff}}
h1{{font-size:22px;margin:0 0 4px}} h2{{font-size:18px;margin:22px 0 8px;border-bottom:1px solid #e5e7eb;padding-bottom:4px}} h3{{font-size:16px;margin:16px 0 6px}}
table{{border-collapse:collapse;width:100%;font-size:13.5px;display:block;overflow-x:auto}} th,td{{border:1px solid #e5e7eb;padding:5px 7px;vertical-align:top;text-align:left}} th{{background:#f3f4f6}}
code{{font-family:ui-monospace,Menlo,monospace;font-size:12.5px;background:#f3f4f6;padding:1px 4px;border-radius:4px}}
pre{{background:#0f172a;color:#e2e8f0;padding:12px;border-radius:8px;overflow-x:auto;font-size:12.5px;line-height:1.45}} pre code{{background:none;color:inherit;padding:0}}
details{{margin:10px 0}} summary{{cursor:pointer;font-weight:600}}
.toc ul{{margin:4px 0 4px 18px;padding:0}} .toc li{{margin:2px 0;font-size:14px}}
@media (max-width:600px){{body{{padding:10px}} section.card{{padding:12px}}}}
</style></head><body><main>
<section class="card signoff">{body_summary}</section>
<section class="card"><details><summary>Contents</summary><div class="toc">{toc}</div></details>{body_design}</section>
<section class="card"><h2 id="sketch">Type sketch and module map (sketch.ts)</h2><pre><code>{html.escape(sketch)}</code></pre></section>
</main></body></html>'''
(here / 'index.html').write_text(page)
print('built', len(page))
