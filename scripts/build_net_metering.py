"""
Build site/net-metering.json from the SREDA net-metering download.

Source folder: "Renewable Energy/Net Metering/"
  * nesco_net_metering.xlsx  (preferred — "Master" + "Metadata" sheets)
  * nesco_net_metering.json  (fallback if the workbook is missing)

The records come from SREDA's National Database of Renewable Energy
(https://ndre.sreda.gov.bd), agency = NESCO, category = Net Metering
Rooftop Solar. Every summary the website shows (yearly, district-wise,
SDD-wise) is recomputed here from the record list so the numbers always
reconcile with the details table.

Rules carried over from the source workbook:
  * DC and AC capacity are kept separate — never added together.
  * An explicit AC value of 0 is a *reported* zero (source confirmation
    needed), not a missing value; it is flagged per record.
  * Calendar year comes only from COD. Records without a valid COD are
    grouped under "Unknown year" and excluded from cumulative series.
  * SDD "Unassigned" means the source names no S&D / supply office; we
    never infer an SDD from district or upazila.
"""
import datetime as dt
import json
from collections import OrderedDict, defaultdict

from common import ROOT, num, open_wb, s, write_json

SRC_DIR = ROOT / "Renewable Energy" / "Net Metering"
SRC_XLSX = SRC_DIR / "nesco_net_metering.xlsx"
SRC_JSON = SRC_DIR / "nesco_net_metering.json"

UNASSIGNED = "Unassigned"
UNKNOWN_YEAR = "Unknown year"

MASTER_HEADERS = [
    "SID / System ID", "Project / system name", "District", "Upazila",
    "Location", "SDD / S&D", "DC capacity (kWp)", "AC capacity (kW)", "COD",
    "Calendar year", "Present status", "Data-quality notes",
]


# ── Readers ────────────────────────────────────────────────────────────

def _iso(v):
    if isinstance(v, (dt.datetime, dt.date)):
        return v.strftime("%Y-%m-%d")
    t = s(v)
    if not t or t.startswith("0000"):
        return None
    return t[:10]


def _year(v, cod):
    if isinstance(v, (int, float)):
        return int(v)
    t = s(v)
    if t.isdigit():
        return int(t)
    if cod and cod[:4].isdigit():
        return int(cod[:4])
    return None


def read_xlsx():
    wb = open_wb(SRC_XLSX)
    ws = wb["Master"]

    # Find the header row instead of hard-coding its position.
    header_row = None
    for r in range(1, 15):
        vals = [s(c.value) for c in ws[r]]
        if vals and vals[0].lower().startswith("sid"):
            header_row = r
            break
    if header_row is None:
        raise ValueError("Master sheet: header row with 'SID / System ID' not found")
    headers = [s(c.value) for c in ws[header_row]]
    if headers[:len(MASTER_HEADERS)] != MASTER_HEADERS:
        print(f"  ! Master headers changed: {headers}")

    records = []
    for row in ws.iter_rows(min_row=header_row + 1, values_only=True):
        if not row or not s(row[0]):
            continue
        cod = _iso(row[8])
        records.append({
            "sid": s(row[0]),
            "project_name": s(row[1]),
            "district": s(row[2]) or UNASSIGNED,
            "upazila": s(row[3]) or None,
            "location": s(row[4]) or None,
            "sdd": s(row[5]) or UNASSIGNED,
            "dc_kwp": num(row[6]),
            "ac_kw": num(row[7]),
            "cod": cod,
            "year": _year(row[9], cod),
            "status": s(row[10]) or None,
            "notes": s(row[11]) or "",
        })

    meta = {}
    if "Metadata" in wb.sheetnames:
        for k, v in wb["Metadata"].iter_rows(min_row=1, values_only=True):
            if k and v is not None:
                meta[s(k)] = _iso(v) if isinstance(v, (dt.datetime, dt.date)) else v
    return records, {
        "retrieval_date": meta.get("retrieval date"),
        "source_name": meta.get("source / name"),
        "listing_url": meta.get("source / listing url"),
        "organization": meta.get("source / organization"),
        "category": meta.get("source / category"),
        "headline_dc_mwp": meta.get("validation / source headline / all statuses / dc capacity mwp"),
        "headline_count": meta.get("validation / source headline / all statuses / system count"),
    }, SRC_XLSX.name


def read_json_fallback():
    d = json.loads(SRC_JSON.read_text(encoding="utf-8"))
    records = []
    for r in d["records"]:
        records.append({
            "sid": s(r["sid"]),
            "project_name": s(r["project_name"]),
            "district": r.get("district") or UNASSIGNED,
            "upazila": r.get("upazila"),
            "location": r.get("location"),
            "sdd": r.get("sdd") or UNASSIGNED,
            "dc_kwp": num(r.get("dc_capacity_kwp")),
            "ac_kw": num(r.get("ac_capacity_kw")),
            "cod": r.get("cod"),
            "year": r.get("calendar_year"),
            "status": r.get("present_status"),
            "notes": " ".join(r.get("data_quality_notes") or []),
        })
    m = d.get("metadata", {})
    src = m.get("source", {})
    head = (m.get("validation", {}).get("source_headline", {}).get("all_statuses", {}))
    return records, {
        "retrieval_date": m.get("retrieval_date"),
        "source_name": src.get("name"),
        "listing_url": src.get("listing_url"),
        "organization": src.get("organization"),
        "category": src.get("category"),
        "headline_dc_mwp": head.get("dc_capacity_mwp"),
        "headline_count": head.get("system_count"),
    }, SRC_JSON.name


# ── Aggregation ────────────────────────────────────────────────────────

def _r(v, nd=2):
    return None if v is None else round(v, nd)


def _flags(rec):
    f = []
    if rec["ac_kw"] == 0:
        f.append("ac_zero")
    if rec["sdd"] == UNASSIGNED:
        f.append("sdd_unassigned")
    if rec["year"] is None:
        f.append("cod_missing")
    if "differs from dedicated capacity" in rec["notes"]:
        f.append("name_capacity_differs")
    if "conflict" in rec["notes"].lower():
        f.append("geo_conflict")
    return f


def _agg(rows):
    dc = sum(r["dc_kwp"] or 0 for r in rows)
    ac = sum(r["ac_kw"] or 0 for r in rows)
    return {
        "systems": len(rows),
        "dc_kwp": _r(dc),
        "ac_kw": _r(ac),
        "ac_zero_count": sum(1 for r in rows if r["ac_kw"] == 0),
    }


def build(records):
    for r in records:
        r["flags"] = _flags(r)

    overall = _agg(records)
    overall["districts"] = len({r["district"] for r in records if r["district"] != UNASSIGNED})
    overall["named_sdds"] = len({r["sdd"] for r in records if r["sdd"] != UNASSIGNED})
    overall["unassigned_sdd_count"] = sum(1 for r in records if r["sdd"] == UNASSIGNED)
    years_known = sorted({r["year"] for r in records if r["year"] is not None})
    overall["first_year"] = years_known[0] if years_known else None
    overall["last_year"] = years_known[-1] if years_known else None
    overall["latest_cod"] = max((r["cod"] for r in records if r["cod"]), default=None)

    # Yearly — every calendar year between first and last (empty years kept),
    # cumulative over known years, then an Unknown-year row with no cumulative.
    by_year = defaultdict(list)
    for r in records:
        by_year[r["year"]].append(r)
    yearly = []
    cum_n = cum_dc = cum_ac = 0
    if years_known:
        for y in range(years_known[0], years_known[-1] + 1):
            a = _agg(by_year.get(y, []))
            cum_n += a["systems"]
            cum_dc += a["dc_kwp"]
            cum_ac += a["ac_kw"]
            yearly.append({"year": y, "label": str(y), **a,
                           "cum_systems": cum_n, "cum_dc_kwp": _r(cum_dc), "cum_ac_kw": _r(cum_ac)})
    if by_year.get(None):
        yearly.append({"year": None, "label": UNKNOWN_YEAR, **_agg(by_year[None]),
                       "cum_systems": None, "cum_dc_kwp": None, "cum_ac_kw": None})

    # District-wise
    by_dist = defaultdict(list)
    for r in records:
        by_dist[r["district"]].append(r)
    district_wise = []
    for d in sorted(by_dist):
        rows = by_dist[d]
        a = _agg(rows)
        a["named_sdds"] = sorted({r["sdd"] for r in rows if r["sdd"] != UNASSIGNED})
        a["unassigned_count"] = sum(1 for r in rows if r["sdd"] == UNASSIGNED)
        a["first_year"] = min((r["year"] for r in rows if r["year"]), default=None)
        a["last_year"] = max((r["year"] for r in rows if r["year"]), default=None)
        district_wise.append({"district": d, **a})

    # SDD-wise — one row per (SDD, district). Named offices sit in a single
    # district; "Unassigned" is split by district so it stays meaningful.
    by_sdd = defaultdict(list)
    for r in records:
        by_sdd[(r["sdd"], r["district"])].append(r)
    sdd_wise = []
    for (sdd, dist), rows in by_sdd.items():
        a = _agg(rows)
        a["first_year"] = min((r["year"] for r in rows if r["year"]), default=None)
        a["last_year"] = max((r["year"] for r in rows if r["year"]), default=None)
        sdd_wise.append({"sdd": sdd, "district": dist, "unassigned": sdd == UNASSIGNED, **a})
    sdd_wise.sort(key=lambda x: (x["unassigned"], x["district"], x["sdd"]))

    statuses = OrderedDict()
    for r in records:
        statuses[r["status"]] = statuses.get(r["status"], 0) + 1

    return overall, yearly, district_wise, sdd_wise, statuses


def main():
    if SRC_XLSX.exists():
        records, meta, used = read_xlsx()
    elif SRC_JSON.exists():
        records, meta, used = read_json_fallback()
    else:
        raise FileNotFoundError(f"No net-metering source in {SRC_DIR}")
    print(f"build_net_metering.py — reading {used}: {len(records)} records")

    # Newest first by COD, unknown COD last.
    records.sort(key=lambda r: r["cod"] or "", reverse=True)

    overall, yearly, district_wise, sdd_wise, statuses = build(records)

    # Reconciliation guard: every view must add back up to the overall total.
    for name, rows in (("yearly", yearly), ("district", district_wise), ("sdd", sdd_wise)):
        n = sum(x["systems"] for x in rows)
        dc = round(sum(x["dc_kwp"] for x in rows), 2)
        assert n == overall["systems"] and abs(dc - overall["dc_kwp"]) < 0.01, \
            f"{name} view does not reconcile: {n} / {dc}"
    if meta.get("headline_count") and int(meta["headline_count"]) != overall["systems"]:
        print(f"  ! system count {overall['systems']} differs from SREDA headline {meta['headline_count']}")

    write_json("net-metering.json", {
        "title": "NESCO Net Metering Rooftop Solar",
        "source_file": used,
        "source": meta,
        "statuses": statuses,
        "overall": overall,
        "yearly": yearly,
        "district_wise": district_wise,
        "sdd_wise": sdd_wise,
        "records": records,
    })
    print(f"  {overall['systems']} systems · {overall['dc_kwp']:,} kWp DC · "
          f"{overall['ac_kw']:,} kW AC reported · {len(district_wise)} districts · "
          f"{overall['named_sdds']} named SDD/ESU")


if __name__ == "__main__":
    main()
