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
PDSSP_LINES_CANDIDATES = [
    ROOT / "PDSSP" / "Line_Requirement_for_All_SDDS__Transposed_.xlsx",  # newest (transposed)
    ROOT / "PDSSP" / "Line_Requirement_for_All_SDDS__Updated_.xlsx",     # previous
    ROOT / "PDSSP" / "Line Requirement for All SDDS (Updated).xlsx",     # legacy
]
PDSSP_LINES = next((p for p in PDSSP_LINES_CANDIDATES if p.exists()), PDSSP_LINES_CANDIDATES[0])


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
    """Parse the transposed-format Line Requirement workbook.

    Transposed layout per sheet:
      * 1-3 header rows at the top (each row labels one column of a
        column-header stack). For SDD sheets there is 1 header row
        ("Name Of S&DD/ ESU" + S&DD names); for Substation sheets
        there are 3 (Sr.No / SDD / Substation); for Zone there is 1
        ("Circle Name" + circle names); for Grand there is 1
        ("Zone" + zone names).
      * Remaining rows are line-work metrics (33 kV Upgradation,
        11 kV Upgradation, …, Total Lineworks, System Loss, Purpose).
        First cell of each is the metric label; subsequent cells are
        the per-entity values.
    """
    wb = open_wb(PDSSP_LINES)
    out = []
    for sn in wb.sheetnames:
        ws = wb[sn]
        sheet = _parse_transposed_sheet(ws, sn)
        if sheet and sheet["data_rows"]:
            out.append(sheet)
    return out


def _parse_transposed_sheet(ws, sheet_name):
    # Find the first column that has a meaningful label on row 1
    # (some sheets have an empty leading column).
    start_col = None
    first_label = None
    for col in range(1, min(ws.max_column, 6) + 1):
        v = s(ws.cell(row=1, column=col).value).lower()
        if v:
            start_col = col
            first_label = v
            break
    if not start_col:
        return None

    if first_label.startswith("sr"):
        kind, header_row_count = "substation", 3
    elif "name of" in first_label and "s&dd" in first_label:
        kind, header_row_count = "sdd", 1
    elif "circle name" in first_label:
        kind, header_row_count = "zone", 1
    elif first_label.startswith("zone"):
        kind, header_row_count = "grand", 1
    else:
        return None

    # ── collect header rows (starting from start_col) ──
    header_rows = []
    for r in range(1, header_row_count + 1):
        row_vals = [s(ws.cell(row=r, column=c).value) for c in range(start_col, ws.max_column + 1)]
        # trim trailing empty cells
        while row_vals and not row_vals[-1]:
            row_vals.pop()
        header_rows.append(row_vals)

    # Total number of data columns = (longest header row) - 1
    n_cols = max(len(hr) for hr in header_rows) - 1 if header_rows else 0
    # pad header rows so all are the same length
    for hr in header_rows:
        while len(hr) < n_cols + 1:
            hr.append("")

    # ── data rows ──
    data_rows = []
    for r in range(header_row_count + 1, ws.max_row + 1):
        cells = [ws.cell(row=r, column=start_col + c).value for c in range(n_cols + 1)]
        if not any(cells):
            continue
        label = s(cells[0])
        if not label and not any(s(v) for v in cells[1:]):
            continue
        values = []
        for v in cells[1:]:
            if v is None or v == "":
                values.append(None)
            elif isinstance(v, (int, float)):
                values.append(float(v))
            else:
                sv = s(v)
                n = num(sv)
                values.append(n if n is not None else sv)
        data_rows.append({"label": label, "values": values})

    return {
        "sheet": sheet_name.strip(),
        "kind": kind,
        "header_rows": header_rows,
        "data_rows": data_rows,
    }


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
                        "scope": {
                            "funding":  "Asian Development Bank (ADB)",
                            "status":   "Ongoing",
                            "overview": (
                                "NIDMP is a comprehensive grid-modernization "
                                "programme that strengthens NESCO's 33/11 kV "
                                "distribution backbone. Under this project "
                                "ADB funds new substation construction, "
                                "upgradation of existing AIS substations, "
                                "addition of GIS / AIS switching substations, "
                                "and supply of modern switchgear and bay-"
                                "breakers."
                            ),
                            "objectives": [
                                "Build 3 new 33/11 kV GIS substations to serve city loads",
                                "Build 3 new 33/11 kV AIS substations in distribution-deficit zones",
                                "Upgrade 10 existing AIS substations with additional power transformers and modern switchgear",
                                "Add 3 new 33 kV GIS switching substations off major grid SSs",
                                "Add 2 new 33 kV AIS switching substations to relieve loaded grid SSs",
                                "Supply replacement 33 kV bay-breakers for selected grid SSs",
                            ],
                        },
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
                        "scope": {
                            "funding":  "New Development Bank (NDB)",
                            "status":   "Upcoming",
                            "overview": (
                                "PDSSP is an upcoming, NDB-funded programme "
                                "to strengthen the entire NESCO distribution "
                                "network. The project covers every NESCO "
                                "Circle (Rajshahi-1, Rajshahi-2, Pabna, "
                                "Bogura, Naogaon, Rangpur-1, Rangpur-2 and "
                                "Dinajpur) with substation upgrades, "
                                "comprehensive 33 / 11 / 0.4 kV line "
                                "upgradation, and large-scale new line "
                                "construction targeted at reducing system "
                                "loss and improving reliability."
                            ),
                            "objectives": [
                                "Upgrade selected 33/11 kV substations with new power transformers, 33 kV VCBs and 11 kV switchgear",
                                "Upgrade existing 33 kV, 11 kV, 11 kV (Dog Covered), 11/0.4 kV and 0.4 kV distribution lines",
                                "Construct new 33 kV, 11 kV, 11/0.4 kV and 0.4 kV lines to extend coverage",
                                "Replace ageing 33 kV circuit breakers on the source-line side",
                                "Add distribution transformers (315 kVA / 250 kVA / 200 kVA) at deficit locations",
                                "Add RMUs (Ring Main Units) for ring-fed feeders",
                            ],
                        },
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
