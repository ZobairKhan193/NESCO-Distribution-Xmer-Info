"""
Build site/projects.json from NIDMP/ and PDSSP/ source workbooks.

Output shape is designed to scale per AGENT_BRIEF §4:
{
  "categories": [
    {
      "id": "ongoing",
      "label": "Ongoing Projects",
      "projects": [{"id": "nidmp", "code": "NIDMP", "name": "...", ...}, ...]
    },
    {"id": "upcoming", "label": "Upcoming Projects", "projects": [...]}
  ]
}

Each project includes a `summary_rows` list (substation-wise BOQ summary)
and project-level metadata so additional projects can be added later just
by parsing one more workbook.
"""
from common import ROOT, open_wb, num, s, write_json

NIDMP_SUMMARY = ROOT / "NIDMP" / "ADB_AIS_Substation_Upgradation_Summary (Claud).xlsx"
NIDMP_BAYS    = ROOT / "NIDMP" / "Grid_Bay_Breakers.xlsx"
PDSSP_SUMMARY = ROOT / "PDSSP" / "NDB SS_Upgradation_Substation_Summary.xlsx"
PDSSP_LINES   = ROOT / "PDSSP" / "Line Requirement for All SDDS (Updated).xlsx"


def _read_table(ws, header_row, max_cols=None):
    """Read a row-oriented table. A row is considered data iff at least one
    non-empty value is present (we don't require column 1 to be non-empty
    because zone/circle columns are often merged & only filled on the first
    sub-row)."""
    headers = [s(c.value) for c in ws[header_row]]
    if max_cols:
        headers = headers[:max_cols]
    rows = []
    for r in ws.iter_rows(min_row=header_row + 1, values_only=True):
        if not r:
            continue
        rec = {}
        for i, h in enumerate(headers):
            if not h:
                continue
            rec[h] = s(r[i]) if i < len(r) else ""
        # Need at least one non-empty value, AND we skip rows where ALL of
        # (substation/name) and (s/n) columns are blank — those are usually
        # spacer rows.
        if not any(v for v in rec.values()):
            continue
        rows.append(rec)
    return headers, rows


def parse_nidmp_summary():
    wb = open_wb(NIDMP_SUMMARY)
    ws = wb["Substation Summary"]
    headers, rows = _read_table(ws, header_row=5)
    return {"headers": headers, "rows": rows}


def parse_nidmp_bays():
    wb = open_wb(NIDMP_BAYS)
    ws = wb["Grid Bay-Breakers"]
    headers, rows = _read_table(ws, header_row=1)
    return {"headers": headers, "rows": rows}


def parse_pdssp_summary():
    wb = open_wb(PDSSP_SUMMARY)
    ws = wb["Substation Summary"]
    headers, rows = _read_table(ws, header_row=5)
    return {"headers": headers, "rows": rows}


def parse_pdssp_lines():
    """Each sheet is a circle or zone with a header row at row 3 (and rows
    1-2 contain an outer title block). We emit one entry per sheet."""
    wb = open_wb(PDSSP_LINES)
    out = []
    for sn in wb.sheetnames:
        ws = wb[sn]
        # Find the header row — first row with "Sr. No." or "Name of the SDD"
        header_row = None
        for r in range(1, min(10, ws.max_row) + 1):
            cells = [s(c.value).lower() for c in ws[r] if c.value]
            if any("sdd" in c for c in cells) and any("substation" in c for c in cells):
                header_row = r
                break
        if not header_row:
            continue
        headers = [s(c.value) for c in ws[header_row]]
        rows = []
        for r in ws.iter_rows(min_row=header_row + 1, values_only=True):
            if not r or r[0] is None:
                continue
            rec = {}
            for i, h in enumerate(headers):
                if not h:
                    continue
                v = r[i] if i < len(r) else None
                rec[h] = num(v) if isinstance(v, (int, float)) else s(v)
            if any(v not in ("", None) for v in rec.values()):
                rows.append(rec)
        if rows:
            out.append({"sheet": sn, "headers": [h for h in headers if h], "rows": rows})
    return out


def main():
    print("build_projects.py — reading NIDMP + PDSSP workbooks")
    payload = {
        "categories": [
            {
                "id": "ongoing",
                "label": "Ongoing Projects",
                "projects": [
                    {
                        "id": "nidmp",
                        "code": "NIDMP",
                        "name": ("Network Infrastructure Development & "
                                 "Modernization of Power Distribution System "
                                 "in NESCO Area"),
                        "summary": ("ADB-funded modernization project. Adds "
                                    "and upgrades 33/11 kV substations, "
                                    "control rooms, switchgear and bay-breakers "
                                    "across NESCO grid sites."),
                        "substation_summary": parse_nidmp_summary(),
                        "grid_bay_breakers":  parse_nidmp_bays(),
                    },
                ],
            },
            {
                "id": "upcoming",
                "label": "Upcoming Projects",
                "projects": [
                    {
                        "id": "pdssp",
                        "code": "PDSSP",
                        "name": "Power Distribution System Strengthening Project",
                        "summary": ("Upcoming distribution-network strengthening "
                                    "programme — upgrade of 33 kV, 11 kV and "
                                    "11/0.4 kV lines plus new substation work "
                                    "across all NESCO circles."),
                        "substation_summary": parse_pdssp_summary(),
                        "line_requirements":  parse_pdssp_lines(),
                    },
                ],
            },
        ],
    }
    write_json("projects.json", payload)


if __name__ == "__main__":
    main()
