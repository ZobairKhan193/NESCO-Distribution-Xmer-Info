"""
Build site/zrs.json from `ZRS/ZRS_Transformer_Consolidated_2025.xlsx`.

The workbook has 5 useful sheets:
  - Summary_Monthly_Wide   one row per (Month, ZRS), metrics × kVA columns
  - Summary_Monthly_Long   normalized (Year, Month, ZRS, Metric, kVA, Value)
  - Monthly_Totals         grand totals per month (+ YEAR TOTAL row)
  - Summary_Yearly_ZRS     one row per ZRS, year aggregate
  - Deliveries_Detail      Year, Month, ZRS, Receiving Office, kVA, Quantity

We emit a single JSON keyed for direct consumption by the UI. The 8 metrics
are split into "stock" vs "flow" types so the UI knows whether summing
across months is meaningful (see AGENT_BRIEF §9b).
"""
from collections import defaultdict

from common import ROOT, open_wb, num, s, write_json

SRC = ROOT / "ZRS" / "ZRS_Transformer_Consolidated_2025.xlsx"

# Mapping from the slug used in Summary_Monthly_Long to the display label
# and whether it's a flow (summable) or stock (point-in-time) metric.
METRIC_DEFS = [
    ("prev_balance",         "Balance of Repairable (Previous Month)", "stock"),
    ("received",             "Transformers Received",                  "flow"),
    ("repaired",             "Transformers Repaired",                  "flow"),
    ("unrepairable",         "Unrepairable Transformers",              "flow"),
    ("cum_balance_repair",   "Cumulative Balance of Repairable",       "stock"),
    ("supplied",             "Repaired Transformers Supplied",         "flow"),
    ("prev_deliverable",     "Balance of Deliverable (Previous Month)","stock"),
    ("cum_deliverable",      "Cumulative Balance of Deliverable",      "stock"),
]
METRIC_ORDER = [m[0] for m in METRIC_DEFS]
METRIC_LABEL = {m[0]: m[1] for m in METRIC_DEFS}
METRIC_KIND  = {m[0]: m[2] for m in METRIC_DEFS}

KVA_BUCKETS = ["250", "200", "100", "Total"]

MONTHS = ["January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"]

ZRS_LOCATIONS = ["Bogura", "Dinajpur", "Rajshahi", "Rangpur"]


def _build_long(ws):
    """Read Summary_Monthly_Long → records list (skip header row)."""
    rows = []
    for r in ws.iter_rows(min_row=2, values_only=True):
        if r is None or r[0] is None:
            continue
        year, mnum, month, zrs, metric, _label, kva, value = (
            r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7]
        )
        if not zrs or not metric or not month:
            continue
        rows.append({
            "year": int(num(year) or 0),
            "month_num": int(num(mnum) or 0),
            "month": s(month),
            "zrs": s(zrs),
            "metric": s(metric),
            "kva": s(kva),
            "value": num(value),
        })
    return rows


def _build_yearly(ws):
    """Read Summary_Yearly_ZRS."""
    # Row 1 has metric headers, row 2 has kVA sub-headers, data starts row 3.
    rows = []
    for r in ws.iter_rows(min_row=3, values_only=True):
        if r is None or r[0] is None:
            continue
        rows.append({
            "zrs": s(r[0]),
            "last_month": s(r[1]),
            "months_reported": s(r[2]),
            # 8 metrics × 4 buckets — index 3..34 inclusive
            "metrics": _parse_8_blocks(r[3:35]),
        })
    return rows


def _build_monthly_totals(ws):
    """Read Monthly_Totals: per-month grand totals across all ZRS."""
    rows = []
    for r in ws.iter_rows(min_row=3, values_only=True):
        if r is None or r[0] is None:
            continue
        first = r[0]
        if isinstance(first, str) and "YEAR TOTAL" in first.upper():
            label = "YEAR TOTAL"
            mnum = None
            month = "YEAR TOTAL"
        else:
            mnum = int(num(first) or 0)
            month = s(r[1])
            label = month
        rows.append({
            "label": label,
            "month_num": mnum,
            "month": month,
            "metrics": _parse_8_blocks(r[2:34]),
        })
    return rows


def _parse_8_blocks(values):
    """Given 32 sequential cells = 8 metrics × 4 kVA buckets, structure them.

    Returns: {metric_slug: {kva: value, ...}, ...}
    """
    out = {}
    for i, slug in enumerate(METRIC_ORDER):
        block = values[i * 4 : i * 4 + 4]
        out[slug] = {
            "250":   num(block[0]),
            "200":   num(block[1]),
            "100":   num(block[2]),
            "Total": num(block[3]),
        }
    return out


def _build_deliveries(ws):
    rows = []
    for r in ws.iter_rows(min_row=2, values_only=True):
        if r is None or r[0] is None:
            continue
        year, mnum, month, zrs, office, kvas, qty = r[:7]
        if not office:
            continue
        rows.append({
            "year": int(num(year) or 0),
            "month_num": int(num(mnum) or 0),
            "month": s(month),
            "zrs": s(zrs),
            "office": s(office),
            "kva": s(kvas),
            "qty": num(qty) or 0,
        })
    return rows


def _monthly_by_zrs(long_rows):
    """Pivot long format into {zrs: {month: {metric: {kva: value}}}}."""
    tree = defaultdict(lambda: defaultdict(lambda: defaultdict(dict)))
    for r in long_rows:
        tree[r["zrs"]][r["month"]][r["metric"]][r["kva"]] = r["value"]
    return {z: {m: dict(v) for m, v in months.items()} for z, months in tree.items()}


def main():
    print(f"build_zrs.py — reading {SRC.name}")
    wb = open_wb(SRC)

    long_rows = _build_long(wb["Summary_Monthly_Long"])
    yearly    = _build_yearly(wb["Summary_Yearly_ZRS"])
    monthly_totals = _build_monthly_totals(wb["Monthly_Totals"])
    deliveries = _build_deliveries(wb["Deliveries_Detail"])

    by_zrs = _monthly_by_zrs(long_rows)

    # Months that actually have data in the file (skip months with all-null).
    months_present = sorted(
        {r["month"] for r in long_rows if r["value"] is not None},
        key=lambda m: MONTHS.index(m) if m in MONTHS else 99,
    )
    # AGENT_BRIEF §9b: April 2025 is missing from the source and Dinajpur
    # stops reporting after February 2025. Surface these so the UI does not
    # have to re-derive them.
    notes = {
        "missing_months": ["April"],
        "dinajpur_last_month": "February",
        "dinajpur_note": (
            "From March 2025 onward Dinajpur is no longer reported "
            "(only Bogura, Rajshahi, Rangpur)."
        ),
        "april_note": "April 2025 data is unavailable in the source workbook.",
    }

    payload = {
        "year": 2025,
        "zrs_locations": ZRS_LOCATIONS,
        "months_in_order": MONTHS,
        "months_present": months_present,
        "kva_buckets": KVA_BUCKETS,
        "metrics": [
            {"slug": k, "label": v, "kind": METRIC_KIND[k]}
            for k, v in METRIC_LABEL.items()
        ],
        "notes": notes,
        "by_zrs": by_zrs,           # nested: zrs→month→metric→kva→value
        "monthly_totals": monthly_totals,
        "yearly_per_zrs": yearly,
        "deliveries": deliveries,
        "long_rows": long_rows,     # for the flexible trend chart
    }
    write_json("zrs.json", payload)


if __name__ == "__main__":
    main()
