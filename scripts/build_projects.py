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


# --- Static lists transcribed from NIDMP/List of SSs Under ADB Project.pdf ---
# The PDF is not machine-friendly so we mirror its 5 categorised tables here
# verbatim. If the PDF is revised, update these lists in one place.
NIDMP_ALL_SUBSTATIONS = {
    "new_33_11_gis": {
        "label": "New 33/11 kV GIS Substations",
        "count_label": "03 Nos.",
        "headers": ["Sr.", "Name of the SS", "SDD", "Capacity", "Location"],
        "rows": [
            ["1", "Chandipur",                 "SDD-2, Rajshahi", "2x20/26.66", "Rajshahi City"],
            ["2", "Bogura SDD-1 Campus SS",    "SDD-1, Bogura",   "2x20/26.66", "Bogura City"],
            ["3", "Rangpur SDD-1 Campus SS",   "SDD-1, Rangpur",  "2x20/26.66", "Rangpur City"],
        ],
    },
    "new_33_11_ais": {
        "label": "New 33/11 kV AIS Substations",
        "count_label": "03 Nos.",
        "headers": ["Sr.", "Name of the SS", "SDD", "Capacity", "Location"],
        "rows": [
            ["1", "Kodomtola",                 "SDD-1, Pabna",    "2x10/13.33", "Pabna City"],
            ["2", "Baharkasna SS",             "SDD-3, Rangpur",  "2x10/13.33", "Rangpur City"],
            ["3", "Dinajpur SDD-1 Campus SS",  "SDD-1, Dinajpur", "2x10/13.33", "Dinajpur City"],
        ],
    },
    "upgrade_33_11_ais": {
        "label": "33/11 kV AIS Substations — Upgradation",
        "count_label": "10 Nos.",
        "headers": ["Sr.", "Name of the SS", "SDD", "Upgradation Capacity", "Location"],
        "rows": [
            ["1",  "Katkipara",           "SDD-2, Rangpur",   "1x20/26.66", "Rangpur City"],
            ["2",  "Mahiganj",            "SDD-3, Rangpur",   "1x20/26.66", "Rangpur City"],
            ["3",  "Dhangora",            "SDD-2, Gaibandha", "1x20/26.66", "Gaibandha"],
            ["4",  "Niamotpur (Saidpur)", "Saidpur",          "1x20/26.66", "Saidpur"],
            ["5",  "Golahat",             "Saidpur",          "1x20/26.66", "Saidpur"],
            ["6",  "Fakirpara",           "SDD-1, Dinajpur",  "1x20/26.66", "Dinajpur City"],
            ["7",  "Balubari",            "SDD-2, Dinajpur",  "1x20/26.66", "Dinajpur City"],
            ["8",  "Upashahar",           "SDD-2, Dinajpur",  "1x20/26.66", "Dinajpur City"],
            ["9",  "Setabganj",           "Setabganj",        "1x20/26.66", "Dinajpur"],
            ["10", "Panchagarh",          "Panchagarh",       "1x20/26.66", "Panchagarh"],
        ],
    },
    "new_33_gis_switching": {
        "label": "New 33 kV GIS Switching Substations",
        "count_label": "03 Nos.",
        "headers": ["Sr.", "Grid SS Name", "Name of the SS", "Location"],
        "rows": [
            ["11", "Katakhali 132/33 kV SS",     "Katakhali",     "Rajshahi City"],
            ["12", "Rangpur 132/33 kV SS",       "Lalbag",        "Rangpur City"],
            ["13", "Purbosadipur 132/33 kV SS",  "Purbosadipur",  "Dinajpur"],
        ],
    },
    "new_33_ais_switching": {
        "label": "New 33 kV AIS Switching Substations",
        "count_label": "02 Nos.",
        "headers": ["Sr.", "Grid SS Name", "Name of the SS", "Location"],
        "rows": [
            ["14", "Domar 230/132/33 kV SS",  "Domar",      "Domar, Nilphamari"],
            ["15", "Hatibandha 132/33 kV SS", "Hatibandha", "Hatibandha, Lalmonirhat"],
        ],
    },
}


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
    """Each sheet is one of:
      - a CIRCLE sheet (rows = S&DDs/ESUs in that Circle)
      - a ZONE sheet (rows = Circles in that Zone)
      - the GRAND SUMMARY sheet (rows = Zones + a Total= row)
      - a per-SS detail sheet (Rangpur Circle-2, Dinajpur Circle — rows
        = substations under an S&DD)
    We classify by inspecting the header row and emit one entry per
    sheet so the UI can pick the right rendering.
    """
    wb = open_wb(PDSSP_LINES)
    out = []
    for sn in wb.sheetnames:
        ws = wb[sn]
        header_row = None
        kind = None
        # Find the first row that has a recognisable name column.
        for r in range(1, min(10, ws.max_row) + 1):
            cells_low = [s(c.value).lower() for c in ws[r] if c.value]
            joined = " | ".join(cells_low)
            if not cells_low:
                continue
            if "name of the sdd" in joined and "substation" in joined:
                header_row, kind = r, "substation"
                break
            if "name of s&dd" in joined or "name of  s&dd" in joined or "name of the s&dd" in joined:
                header_row, kind = r, "sdd"
                break
            if joined.startswith("circle name") or "circle name" in cells_low:
                header_row, kind = r, "zone"
                break
            if cells_low[0] == "zone":
                header_row, kind = r, "grand"
                break
        if not header_row:
            continue

        headers = [s(c.value) for c in ws[header_row]]
        rows = []
        for r in ws.iter_rows(min_row=header_row + 1, values_only=True):
            if not r:
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
            out.append({
                "sheet": sn,
                "kind": kind,
                "headers": [h for h in headers if h],
                "rows": rows,
            })
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
                                    "new 33/11 kV substations + switching SSs "
                                    "and upgrades existing ones across the "
                                    "NESCO grid (21 substations in total, "
                                    "across 5 categories)."),
                        "substation_summary": parse_nidmp_summary(),
                        "grid_bay_breakers":  parse_nidmp_bays(),
                        # All 21 substations under ADB, transcribed from the
                        # PDF "List of SSs Under ADB Project". 5 categories.
                        "all_substations": NIDMP_ALL_SUBSTATIONS,
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
