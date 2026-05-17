"""
Build site/homepage-data.json from `Technical_Highlights foir Homepage.xlsx`.

The Excel shape is:
  Row 3 (headers): Particulars | <FY1> | <FY2> | ... | <FYn>
  Rows 4+        : metric label | value | value | ... | value

We keep the same JSON shape the existing app.js consumed, so renderers in
app.js stay backwards-compatible. The brief explicitly bans the
"Technical Highlights for the last seven fiscal years (FY 2018-2019 – FY
2023-2024)" subtitle, so we leave the subtitle blank and let the UI show
just the data.
"""
from common import ROOT, open_wb, s, write_json

SRC = ROOT / "Technical_Highlights foir Homepage.xlsx"


def main():
    print(f"build_homepage.py — reading {SRC.name}")
    wb = open_wb(SRC)
    ws = wb["Technical Highlights"]

    # Headers live on row 3; first col is "Particulars".
    headers = [s(c.value) for c in ws[3]]
    year_cols = [(i, h) for i, h in enumerate(headers) if h and h != "Particulars"]
    years = [h for _, h in year_cols]

    metrics = []
    for row in ws.iter_rows(min_row=4, values_only=True):
        if not row or row[0] is None:
            continue
        label = s(row[0])
        if not label:
            continue
        values = [s(row[i]) for i, _ in year_cols]
        if not any(values):
            continue
        metrics.append({"label": label, "values": values})

    payload = {
        "title": "NESCO DNMS — Technical Highlights",
        "subtitle": "",  # brief: no "for the last seven fiscal years" phrase
        "years": years,
        "metrics": metrics,
    }
    write_json("homepage-data.json", payload)


if __name__ == "__main__":
    main()
