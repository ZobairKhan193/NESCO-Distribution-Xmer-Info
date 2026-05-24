"""
Parse NIDMP/Project_at_a_glance_with_package_description.docx into a
structured dict that's merged into the NIDMP project entry in
site/projects.json by build_projects.py.

Output shape (project["overview"]):
{
  "project_info": [{"subject": "Project Name", "description": "..."},
                   {"subject": "Project Duration", "description": "..."}, ...],
  "duration": {
      "start_iso":  "2025-07-01",
      "end_iso":    "2029-06-30",
      "raw":        "1 July 2025 - 30 June 2029."
  },
  "packages": [{
      "sl": 1, "no": "Package-GD1",
      "description": "...",
      "comments":    "...",
      "stage":       "Document Preparation",   # categorised
      "stage_key":   "doc_prep",               # slug for CSS
      "stage_order": 2                         # for sorting on the kanban
  }, ...],
  "stage_definitions": [
      {"key": "not_started", "label": "Not Started",         "order": 1, "tone": "gray"},
      {"key": "doc_prep",    "label": "Document Preparation","order": 2, "tone": "indigo"},
      ...
  ]
}

The stage is inferred from the free-text Comments column using a small
ordered list of keyword rules — first match wins, falling through to
"Not Started" when the cell is blank or just an em-dash.
"""
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

from common import ROOT

SRC = ROOT / "NIDMP" / "Project_at_a_glance_with_package_description.docx"
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


# ── Stage definitions, in lifecycle order ──
STAGE_DEFS = [
    {"key": "not_started",  "label": "Not Started",           "order": 1, "tone": "gray"},
    {"key": "doc_prep",     "label": "Document Preparation",  "order": 2, "tone": "indigo"},
    {"key": "tor_review",   "label": "TOR / Draft Review",    "order": 3, "tone": "purple"},
    {"key": "procurement",  "label": "Procurement Approval",  "order": 4, "tone": "pink"},
    {"key": "bidding",      "label": "Bidding",               "order": 5, "tone": "orange"},
    {"key": "land",         "label": "Land Acquisition",      "order": 6, "tone": "amber"},
    {"key": "awarded",      "label": "Contract Awarded (LOA)","order": 7, "tone": "teal"},
    {"key": "signed",       "label": "Contract Signed",       "order": 8, "tone": "green"},
    {"key": "completed",    "label": "Completed",             "order": 9, "tone": "green"},
]
_BY_KEY = {d["key"]: d for d in STAGE_DEFS}


# Comment-text → stage_key. First match wins. Order is significant.
STAGE_RULES = [
    (r"contract.{0,12}was signed",             "signed"),
    (r"\bcompleted\b",                          "completed"),
    (r"loa was issued|letter of award|contract will be signed", "awarded"),
    (r"land selection|land acquisition|acquisition.+land",      "land"),
    (r"ifb.+(floated|will be|to be)|bidding.+(floated|will be|to be)|invitation for bids", "bidding"),
    (r"procurement proposal|ccgp|approval stage",               "procurement"),
    (r"draft tor|tor.+sent",                                    "tor_review"),
    (r"bidding document|estimate preparation|document.+preparation", "doc_prep"),
]


def _classify(comment: str) -> str:
    if not comment or comment.strip() in ("", "—", "-", "–"):
        return "not_started"
    text = comment.lower()
    for pattern, key in STAGE_RULES:
        if re.search(pattern, text):
            return key
    return "not_started"


def _docx_tables_and_paragraphs(path: Path):
    """Return (paragraphs, tables) — tables as list of list-of-list-of-str."""
    with zipfile.ZipFile(path) as z:
        body = ET.fromstring(z.read("word/document.xml")).find(f"{W}body")
    paragraphs, tables = [], []
    for child in body:
        tag = child.tag.replace(W, "")
        if tag == "p":
            txt = "".join(t.text or "" for t in child.iter(f"{W}t")).strip()
            if txt:
                paragraphs.append(txt)
        elif tag == "tbl":
            rows = []
            for tr in child.findall(f"{W}tr"):
                cells = ["".join(t.text or "" for t in tc.iter(f"{W}t")).strip()
                         for tc in tr.findall(f"{W}tc")]
                rows.append(cells)
            tables.append(rows)
    return paragraphs, tables


def _parse_duration(raw: str):
    """Pull start/end ISO dates from text like '1 July 2025 – 30 June 2029.'"""
    if not raw:
        return None
    # Normalise dashes
    norm = raw.replace("—", "–").replace("-", "–")
    months = {m.lower(): i for i, m in enumerate(
        ["January","February","March","April","May","June",
         "July","August","September","October","November","December"], start=1)}
    pat = re.compile(r"(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})")
    matches = pat.findall(norm)
    if len(matches) < 2:
        return {"raw": raw, "start_iso": None, "end_iso": None}
    def iso(m):
        d, mon, y = m
        mi = months.get(mon.lower())
        if not mi: return None
        return f"{y}-{mi:02d}-{int(d):02d}"
    return {"raw": raw, "start_iso": iso(matches[0]), "end_iso": iso(matches[-1])}


def build_overview():
    """Public entry point — called from build_projects.py. Returns dict
    or None when the source docx is missing."""
    if not SRC.exists():
        print(f"  (no NIDMP overview docx — skipping)")
        return None

    _, tables = _docx_tables_and_paragraphs(SRC)
    if len(tables) < 2:
        print(f"  (NIDMP overview: expected 2 tables, found {len(tables)})")
        return None

    # ── Table 1: Project Information at a Glance ──
    project_info = []
    duration_raw = ""
    for row in tables[0][1:]:                 # skip header row
        if len(row) < 3 or not row[1].strip():
            continue
        subj, desc = row[1].strip(), row[2].strip()
        project_info.append({"subject": subj, "description": desc})
        if subj.lower().startswith("project duration"):
            duration_raw = desc

    # ── Table 2: Package-wise Breakdown ──
    packages = []
    for row in tables[1][1:]:                 # skip header row
        if len(row) < 4 or not row[1].strip():
            continue
        sl = row[0].strip()
        package_no = row[1].strip()
        description = row[2].strip()
        comments = row[3].strip()
        stage_key = _classify(comments)
        sdef = _BY_KEY[stage_key]
        try:
            sl_num = int(sl)
        except (ValueError, TypeError):
            sl_num = None
        packages.append({
            "sl":          sl_num,
            "no":          package_no,
            "description": description,
            "comments":    comments,
            "stage":       sdef["label"],
            "stage_key":   stage_key,
            "stage_order": sdef["order"],
            "stage_tone":  sdef["tone"],
        })

    return {
        "project_info":      project_info,
        "duration":          _parse_duration(duration_raw),
        "packages":          packages,
        "stage_definitions": STAGE_DEFS,
        "source_file":       SRC.name,
    }


# Allow standalone invocation for debugging
if __name__ == "__main__":
    from common import write_json
    data = build_overview()
    if data:
        write_json("_nidmp_overview_preview.json", data)
        print(f"  parsed {len(data['packages'])} packages")
        print(f"  duration: {data['duration']}")
        from collections import Counter
        print(f"  stages:   {dict(Counter(p['stage'] for p in data['packages']))}")
