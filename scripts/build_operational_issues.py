"""
Build site/operational-issues.json from
  33-11 kV SS Info/Substation_Operational_Issues.xlsx

Source layout:
  R1     — zone-level title ("Rangpur Zone — Substation Operational Issues")
  R2     — subtitle ("VCB & Panel Requirement (With Project Scope)")
  R3     — blank
  R4     — column headers
  R5+    — data rows

Output:
  {
    "title":    "...",
    "subtitle": "...",
    "headers":  [...],
    "rows":     [{ID, sl, circle, substation, office, equipment, qty,
                  issue, year, alignment, in_project}, ...]
  }
"""
from common import ROOT, open_wb, num, s, write_json

SRC = ROOT / "33-11 kV SS Info" / "Substation_Operational_Issues.xlsx"


def _coerce_qty(raw):
    """Quantity is usually "1 set" / "2 sets" / "3 sets" — extract the
    integer and emit both the number and the original label."""
    text = s(raw)
    if not text:
        return None, ""
    n = num(text.split()[0]) if text.split() else None
    return n, text


def main():
    print(f"build_operational_issues.py — reading {SRC.name}")
    if not SRC.exists():
        print(f"  source missing — skipping")
        return
    wb = open_wb(SRC)
    sn = wb.sheetnames[0]
    ws = wb[sn]

    title = s(ws.cell(row=1, column=1).value)
    subtitle = s(ws.cell(row=2, column=1).value)
    headers = [s(ws.cell(row=4, column=c).value) for c in range(1, ws.max_column + 1)]

    rows = []
    for r in range(5, ws.max_row + 1):
        c = lambda col: ws.cell(row=r, column=col).value
        if not c(1):
            continue
        qty_num, qty_text = _coerce_qty(c(7))
        rows.append({
            "id":          s(c(1)),
            "sl":          num(c(2)),
            "circle":      s(c(3)),
            "substation":  s(c(4)),
            "office":      s(c(5)),
            "equipment":   s(c(6)),
            "qty_num":     qty_num,
            "qty":         qty_text,
            "issue":       s(c(8)),
            "year":        s(c(9)),
            "alignment":   s(c(10)),
            "in_project":  s(c(11)),
        })

    write_json("operational-issues.json", {
        "title":    title,
        "subtitle": subtitle,
        "sheet":    sn,
        "headers":  headers,
        "rows":     rows,
    })
    print(f"  wrote {len(rows)} issue rows")


if __name__ == "__main__":
    main()
