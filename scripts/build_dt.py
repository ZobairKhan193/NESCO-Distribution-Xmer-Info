"""
Rebuild site/distribution-transformers.json from the per-SDD/ESU Excel
workbooks under `Distribution Transformer/Rajshahi Analysis/` and
`Distribution Transformer/Rangpur Analysis/`.

Each per-SDD workbook has:
  - One `Summary` sheet (consistent 30-column shape: feeder name +
    total transformers + 5 kVA buckets + LA/DOFC/MCCB/Grounding stats
    + LT Loop conductor counts + KPI coverages).
  - One sheet per feeder, listing every transformer with rating, GIS
    info, LA/DOFC/MCCB/Grounding condition flags, LT-Loop info, phase
    currents, oil temp. Per-feeder sheet column order varies slightly
    so we map by header text rather than column index.

The output JSON shape matches what `loadDTData()` /
`_buildDTAdapters()` in app.js consume:
{
  "sdd_count": N,
  "transformer_count": N,
  "grand_total": { total, kva, la, dofc, mccb, grounding, lt_loop, kpi },
  "sdds": [
    {
      "id": "rajshahi-1",
      "name": "Rajshahi-1",
      "summary": { total, kva, la, dofc, mccb, grounding, lt_loop, kpi, feeders },
      "feeders": [
        { "name": "Binodpur", "transformers": [{ ...transformer fields }] }
      ]
    }
  ]
}
"""
import re
from pathlib import Path

from common import ROOT, open_wb, num, s, write_json

DT_ROOT = ROOT / "Distribution Transformer"
RAJSHAHI = DT_ROOT / "Rajshahi Analysis"
RANGPUR  = DT_ROOT / "Rangpur Analysis"


# ── Summary sheet column layout (Feeder, Total, kVA×5, LA×5, DOFC×5, MCCB×5, Gnd×3, LT×2, KPI×3)
SUMMARY_COLS = {
    "feeder":     0,
    "total":      1,
    "kva_50":     2, "kva_100": 3, "kva_200": 4, "kva_250": 5, "kva_other": 6,
    "la_yes":     7,  "la_no":   8,  "la_good": 9,  "la_bad": 10, "la_req": 11,
    "dofc_yes":  12, "dofc_no": 13, "dofc_good":14, "dofc_bad":15, "dofc_req":16,
    "mccb_yes":  17, "mccb_no": 18, "mccb_good":19, "mccb_bad":20, "mccb_req":21,
    "gnd_yes":   22, "gnd_no":  23, "gnd_req":  24,
    "lt_copper": 25, "lt_aluminium": 26,
    "kpi_la":    27, "kpi_dofc": 28, "kpi_mccb": 29,
}

# Header text → canonical transformer field name. Match is case-insensitive
# and uses a leading substring match so variants like "Transformer Rating
# (kVA)" and "Transformer Rating(kVA)" both hit.
HEADER_MAP = [
    ("serial",                          "sl"),
    ("substation name (g",              "substation_gis"),  # check before plain "substation name"
    ("substation name (a",              "substation_gis"),
    ("substation name",                 "substation"),
    ("feeder name (g",                  "feeder_gis"),
    ("feeder name (a",                  "feeder_gis"),
    ("feeder name",                     "feeder"),
    ("gis id",                          "gis_id"),
    ("transformer rating",              "kva"),
    ("transformer ref",                 "ref_no"),
    ("gis - location",                  "gis_location"),
    ("gis location",                    "gis_location"),
    ("transformer local",               "local_name"),
    ("11 kv la",                        "la_yn"),
    ("11kv la",                         "la_yn"),
    ("11 kv dofc",                      "dofc_yn"),
    ("11kv dofc",                       "dofc_yn"),
    ("0.4 kv mccb",                     "mccb_yn"),
    ("0.4kv mccb",                      "mccb_yn"),
    ("grounding",                       "grounding_yn"),
    ("lt loop",                         "lt_loop_yn"),
    ("lt-loop",                         "lt_loop_yn"),
    ("phase a",                         "phase_a"),
    ("phase b",                         "phase_b"),
    ("phase c",                         "phase_c"),
    ("oil temp",                        "oil_temp"),
]


def _slug(name: str) -> str:
    sl = re.sub(r"[^a-z0-9]+", "-", str(name).lower()).strip("-")
    sl = re.sub(r"-+", "-", sl)
    return sl


def _sdd_name_from_filename(p: Path) -> str:
    """Rajshahi-1-EN.xlsx → 'Rajshahi-1'; Borokhata-EN → 'Borokhata';
       'Rajshahi-3 (Processed).xlsx' → 'Rajshahi-3'. """
    stem = p.stem
    stem = re.sub(r"\s*\(Processed\)\s*$", "", stem, flags=re.I)
    stem = re.sub(r"-EN$", "", stem, flags=re.I)
    return stem.strip()


def _read_summary(wb):
    """Read the per-feeder summary stats. Returns (feeders_list, totals_dict)."""
    if "Summary" not in wb.sheetnames:
        return [], _empty_totals()
    ws = wb["Summary"]
    feeders = []
    totals = _empty_totals()
    for r in range(4, ws.max_row + 1):
        row = [ws.cell(row=r, column=c+1).value for c in range(30)]
        if not row or row[SUMMARY_COLS["feeder"]] in (None, ""):
            continue
        name = s(row[SUMMARY_COLS["feeder"]])
        # Skip "Total" / "Grand Total" rows
        if re.match(r"^\s*(total|grand\s*total)\s*$", name, re.I):
            continue
        f = _row_to_feeder_summary(name, row)
        feeders.append(f)
        _accumulate(totals, f)
    return feeders, totals


def _row_to_feeder_summary(name, row):
    g = lambda key: num(row[SUMMARY_COLS[key]]) or 0
    return {
        "name":  name,
        "total": int(g("total")),
        "kva":   { "50":  int(g("kva_50")), "100": int(g("kva_100")),
                   "200": int(g("kva_200")), "250": int(g("kva_250")),
                   "other": int(g("kva_other")) },
        "la":    { "yes":int(g("la_yes")),  "no":int(g("la_no")),
                   "good":int(g("la_good")),"bad":int(g("la_bad")),"req":int(g("la_req")) },
        "dofc":  { "yes":int(g("dofc_yes")),"no":int(g("dofc_no")),
                   "good":int(g("dofc_good")),"bad":int(g("dofc_bad")),"req":int(g("dofc_req")) },
        "mccb":  { "yes":int(g("mccb_yes")),"no":int(g("mccb_no")),
                   "good":int(g("mccb_good")),"bad":int(g("mccb_bad")),"req":int(g("mccb_req")) },
        "grounding": { "yes":int(g("gnd_yes")),"no":int(g("gnd_no")),"req":int(g("gnd_req")) },
        "lt_loop":   { "copper":int(g("lt_copper")),"aluminium":int(g("lt_aluminium")) },
        "kpi":   { "la":g("kpi_la"),"dofc":g("kpi_dofc"),"mccb":g("kpi_mccb") },
    }


def _empty_totals():
    return {
        "total": 0,
        "kva":   {"50":0,"100":0,"200":0,"250":0,"other":0},
        "la":    {"yes":0,"no":0,"good":0,"bad":0,"req":0},
        "dofc":  {"yes":0,"no":0,"good":0,"bad":0,"req":0},
        "mccb":  {"yes":0,"no":0,"good":0,"bad":0,"req":0},
        "grounding":{"yes":0,"no":0,"req":0},
        "lt_loop":  {"copper":0,"aluminium":0},
        "kpi":   {"la":0,"dofc":0,"mccb":0},
    }


def _accumulate(dst, src):
    """Add src's numeric fields into dst (sum). KPI fields stay weighted-avg
    capable but we just recompute them later from totals where needed.
    String fields like "name" or "feeders" are skipped — they only exist
    on per-feeder records, not on totals."""
    def add(a, b):
        for k in b:
            v = b[k]
            if isinstance(v, dict):
                add(a.setdefault(k, {}), v)
            elif isinstance(v, (int, float)):
                a[k] = (a.get(k, 0) or 0) + (v or 0)
            # Skip strings, lists, etc.
    add(dst, src)


def _recompute_kpi(totals):
    """Weighted-avg KPI = yes / total."""
    t = totals.get("total") or 0
    if t > 0:
        totals["kpi"]["la"]   = (totals["la"]["yes"]   or 0) / t
        totals["kpi"]["dofc"] = (totals["dofc"]["yes"] or 0) / t
        totals["kpi"]["mccb"] = (totals["mccb"]["yes"] or 0) / t


def _find_header_row(ws):
    """Locate the row containing the per-transformer column headers."""
    max_check = min(ws.max_row, 6)
    best_r, best_score = None, 0
    for r in range(1, max_check + 1):
        score = 0
        for c in range(1, min(ws.max_column, 40) + 1):
            v = s(ws.cell(row=r, column=c).value).lower()
            if not v:
                continue
            for hint, _ in HEADER_MAP:
                if v.startswith(hint):
                    score += 1
                    break
        if score > best_score:
            best_r, best_score = r, score
    return best_r if best_score >= 4 else None


def _map_columns(ws, header_row):
    """Return {field_name: col_index_0based} for the header row.

    Each yes/no indicator (LA, DOFC, MCCB, Grounding) is followed by a
    Good/Bad conditional column in the next slot, so we capture both.
    LT Loop is followed by Count + Conductor sub-columns.
    """
    out = {}
    for c in range(ws.max_column):
        v = s(ws.cell(row=header_row, column=c+1).value).lower()
        if not v:
            continue
        for hint, field in HEADER_MAP:
            if v.startswith(hint) and field not in out:
                out[field] = c
                # Pair the next 1-2 columns based on indicator type.
                if field == "la_yn"        and "la_cond" not in out:        out["la_cond"]        = c + 1
                elif field == "dofc_yn"    and "dofc_cond" not in out:      out["dofc_cond"]      = c + 1
                elif field == "mccb_yn"    and "mccb_cond" not in out:      out["mccb_cond"]      = c + 1
                elif field == "grounding_yn" and "grounding_cond" not in out: out["grounding_cond"] = c + 1
                elif field == "lt_loop_yn":
                    if "lt_loop_count" not in out:     out["lt_loop_count"]     = c + 1
                    if "lt_loop_conductor" not in out: out["lt_loop_conductor"] = c + 2
                break
    return out


def _read_feeder_rows(ws, feeder_name):
    """Read every transformer row from a feeder sheet. Returns list of dicts."""
    header_row = _find_header_row(ws)
    if not header_row:
        return []
    cols = _map_columns(ws, header_row)
    out = []
    for r in range(header_row + 1, ws.max_row + 1):
        row = [ws.cell(row=r, column=c+1).value for c in range(ws.max_column)]
        # Skip rows that have no Serial No AND no transformer rating
        sl_v = num(row[cols["sl"]]) if "sl" in cols and cols["sl"] < len(row) else None
        kva_v = num(row[cols["kva"]]) if "kva" in cols and cols["kva"] < len(row) else None
        if sl_v is None and kva_v is None:
            continue
        rec = {"feeder": feeder_name}
        for field, ci in cols.items():
            if ci >= len(row): continue
            v = row[ci]
            if field in ("sl", "kva", "phase_a", "phase_b", "phase_c", "oil_temp", "lt_loop_count"):
                rec[field] = num(v)
            else:
                rec[field] = s(v) or None
        out.append(rec)
    return out


def _read_sdd(path: Path):
    """Process one per-SDD workbook → SDD record."""
    name = _sdd_name_from_filename(path)
    wb = open_wb(path)
    feeders_summary, sdd_totals = _read_summary(wb)
    _recompute_kpi(sdd_totals)

    # Read per-feeder transformer rows from every non-Summary sheet.
    feeders_with_txs = []
    tx_total = 0
    for sn in wb.sheetnames:
        if sn.strip().lower() == "summary":
            continue
        ws = wb[sn]
        rows = _read_feeder_rows(ws, sn)
        if rows:
            tx_total += len(rows)
            feeders_with_txs.append({
                "name":  sn.strip(),
                "transformers": rows,
            })

    return {
        "id":    _slug(name),
        "name":  name,
        "source_file": path.name,
        "summary": {
            **sdd_totals,
            "feeders": feeders_summary,
        },
        "feeders": feeders_with_txs,
        "transformer_count": tx_total,
    }


def main():
    files = sorted(list(RAJSHAHI.glob("*.xlsx")) + list(RANGPUR.glob("*.xlsx")))
    print(f"build_dt.py — reading {len(files)} per-SDD workbooks")
    sdds = []
    grand = _empty_totals()
    skipped = []
    for p in files:
        try:
            rec = _read_sdd(p)
            sdds.append(rec)
            _accumulate(grand, rec["summary"])
        except Exception as e:
            skipped.append((p.name, str(e)))
            print(f"  ! skipped {p.name}: {e}")
    _recompute_kpi(grand)
    # Remove the redundant "feeders" key from grand_total before writing
    grand_top = {k: v for k, v in grand.items() if k != "feeders"}
    total_txs = sum(s["transformer_count"] for s in sdds)
    payload = {
        "version": 2,
        "sdd_count": len(sdds),
        "transformer_count": total_txs,
        "grand_total": grand_top,
        "sdds": sdds,
        "skipped": skipped,
    }
    write_json("distribution-transformers.json", payload)
    print(f"\nProcessed {len(sdds)} SDDs · {total_txs} transformers")
    if skipped:
        print(f"!!! Skipped {len(skipped)}:")
        for name, err in skipped:
            print(f"    {name}: {err}")


if __name__ == "__main__":
    main()
