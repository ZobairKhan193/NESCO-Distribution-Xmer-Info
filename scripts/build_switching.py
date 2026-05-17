"""
Build site/switching-ss.json from the Switching Substations Info workbooks.

Sources:
  - Grid Substation Info.xlsx              → "Grid Substation Locations"
  - switching substation info.xlsx         → "Existing & Proposed", "Ring Line"
  - Grid or Switching SS List (with Google Map Location).xlsx
                                           → "NESCO SS List & Capacity"

The §8 brief instructs us to DROP the "NESCO Switching SS" column from the
"Grid SS-wise NESCO Feeder List" view; we honour that by omitting that
field from the emitted feeder rows.
"""
from common import ROOT, open_wb, num, s, write_json

GRID_INFO_SRC = ROOT / "Switching Substations Info" / "Grid Substation Info.xlsx"
SW_INFO_SRC   = ROOT / "Switching Substations Info" / "switching substation info.xlsx"
NESCO_SS_SRC  = ROOT / "Switching Substations Info" / "Grid or Switching SS List (with Google Map Location).xlsx"


def parse_grid_substations(ws):
    """Row 3 headers, data from row 4."""
    headers = [s(c.value) for c in ws[3]]
    rows = []
    for r in ws.iter_rows(min_row=4, values_only=True):
        if not r or r[0] is None:
            continue
        rec = dict(zip(headers, [s(x) for x in r]))
        rec["feeders_count"] = num(r[7]) if len(r) > 7 else None
        rows.append(rec)
    return {"headers": headers, "rows": rows}


def parse_existing_proposed(ws):
    """33 kV Grid SS-wise NESCO feeders.

    Header row is row 3. We deliberately omit the "NESCO Switching" column
    per AGENT_BRIEF §8.
    """
    headers = [s(c.value) for c in ws[3]]
    rows = []
    for r in ws.iter_rows(min_row=4, values_only=True):
        if not r or r[0] is None:
            continue
        rows.append({
            "sl":              s(r[0]),
            "zone":            s(r[1]),
            "source_ss":       s(r[2]),
            # r[3] is "NESCO Switching" — DROPPED per brief §8.
            "target_ss":       s(r[4]),
            "feeder_name":     s(r[5]),
            "type":            s(r[6]),
            "conductor":       s(r[7]),
            "length_km":       num(r[8]),
        })
    # Keep the kept-only headers
    kept_headers = [h for i, h in enumerate(headers)
                    if i != 3 and h]   # drop "NESCO Switching" column
    return {"headers": kept_headers, "rows": rows}


def parse_ring_lines(ws):
    headers = [s(c.value) for c in ws[3]]
    rows = []
    for r in ws.iter_rows(min_row=4, values_only=True):
        if not r or r[0] is None:
            continue
        rows.append({
            "sl":          s(r[0]),
            "zone":        s(r[1]),
            "grid_ss":     s(r[2]),
            "ss1":         s(r[3]),
            "ss2":         s(r[4]),
            "ring_name":   s(r[5]),
            "type":        s(r[6]),
            "conductor":   s(r[7]),
            "length_km":   num(r[8]),
        })
    return {"headers": headers, "rows": rows}


def parse_nesco_ss_list(ws):
    """Row 3 headers, data from row 4."""
    headers = [s(c.value) for c in ws[3]]
    rows = []
    for r in ws.iter_rows(min_row=4, values_only=True):
        if not r or r[0] is None:
            continue
        rows.append({
            "sl":              s(r[0]),
            "circle":          s(r[1]),
            "sdd_esu":         s(r[2]),
            "ss_name":         s(r[3]),
            "ss_type":         s(r[4]),
            # r[5] is a blank merged cell in some rows
            "capacity_mva":    s(r[6]),
            "transformer_nos": num(r[7]),
            "max_demand_mw":   num(r[8]),
            "total_ss_count":  s(r[9]),
            "feeders_33kv":    num(r[10]),
            "map_url":         s(r[11]),
        })
    return {"headers": headers, "rows": rows}


def main():
    print("build_switching.py — reading switching substations workbooks")

    grid_wb = open_wb(GRID_INFO_SRC)
    sw_wb   = open_wb(SW_INFO_SRC)
    nesco_wb = open_wb(NESCO_SS_SRC)

    payload = {
        "grid_substations":     parse_grid_substations(grid_wb["Grid Substation Locations"]),
        "grid_feeders":         parse_existing_proposed(sw_wb["Existing & Proposed"]),
        "ring_lines":           parse_ring_lines(sw_wb["Ring Line"]),
        "nesco_ss_list":        parse_nesco_ss_list(nesco_wb["NESCO SS List & Capacity"]),
    }
    write_json("switching-ss.json", payload)


if __name__ == "__main__":
    main()
