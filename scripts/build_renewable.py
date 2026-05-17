"""
Build site/renewable-energy.json from the Renewable Energy overview .docx.

The .docx is a Word document; we extract its paragraphs and table rows and
emit a structured JSON the UI can render as headings + paragraphs + tables.
"""
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

from common import ROOT, write_json

SRC = ROOT / "Renewable Energy" / "NESCO_Renewable_Energy_Overview_EN.docx"

W_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def _text(elem):
    return "".join(t.text or "" for t in elem.iter(f"{W_NS}t"))


def _style_name(p):
    """Best-effort: return paragraph style id, e.g. 'Heading1'."""
    pPr = p.find(f"{W_NS}pPr")
    if pPr is None:
        return ""
    pStyle = pPr.find(f"{W_NS}pStyle")
    return (pStyle.get(f"{W_NS}val") or "") if pStyle is not None else ""


def _is_heading(style):
    return style.lower().startswith("heading") or style in ("Title",)


def _heading_level(style):
    for i in range(1, 7):
        if style.lower() == f"heading{i}":
            return i
    return 1 if style == "Title" else 0


def parse_docx(path: Path):
    with zipfile.ZipFile(path) as z:
        xml_bytes = z.read("word/document.xml")
    tree = ET.fromstring(xml_bytes)
    body = tree.find(f"{W_NS}body")

    blocks = []
    for child in body:
        tag = child.tag.replace(W_NS, "")
        if tag == "p":
            txt = _text(child).strip()
            if not txt:
                continue
            style = _style_name(child)
            lvl = _heading_level(style)
            if lvl:
                blocks.append({"kind": "heading", "level": lvl, "text": txt})
            else:
                blocks.append({"kind": "paragraph", "text": txt})
        elif tag == "tbl":
            rows = []
            for tr in child.findall(f"{W_NS}tr"):
                cells = [_text(tc).strip() for tc in tr.findall(f"{W_NS}tc")]
                rows.append(cells)
            if rows:
                blocks.append({"kind": "table", "rows": rows})
    return blocks


def main():
    print(f"build_renewable.py — reading {SRC.name}")
    blocks = parse_docx(SRC)
    write_json("renewable-energy.json", {
        "title": "NESCO Renewable Energy Overview",
        "source": SRC.name,
        "blocks": blocks,
    })


if __name__ == "__main__":
    main()
