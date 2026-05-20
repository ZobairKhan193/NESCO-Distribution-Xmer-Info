"""
Refresh site/substations.json from the latest
`33-11 kV SS Info/All 33-11 kV Substation Info Master File.xlsx`.

Strategy — augment, don't rebuild:
  * The existing substations.json carries rich per-substation data
    (lines_33kv, power_transformers, feeders_11kv) that was curated
    by hand from the heterogeneous per-substation sheets. We do NOT
    want to discard that.
  * The Master File's "Master File" sheet is the canonical source for
    high-level info (Circle, SDD/ESU, GIS/AIS flag, present capacity,
    nos. of power transformers, present max demand, demand by 2030 /
    2035, switchgear type & model, etc.).
  * For every substation in the master sheet we either UPDATE the
    matching entry in substations.json (matched by name, case +
    whitespace insensitive) or ADD a STUB entry for newly listed
    substations.

After this script, the rich feeder/transformer detail still lives
under its original keys; the top-level metadata reflects the latest
master file.
"""
import difflib
import json
import re

from common import ROOT, SITE, open_wb, num, s

MASTER = ROOT / "33-11 kV SS Info" / "All 33-11 kV Substation Info Master File.xlsx"
SS_TYPES = ROOT / "33-11 kV SS Info" / "NESCO Existing 33-11 kV SSs List Summary.xlsx"
OUT    = SITE / "substations.json"

# Column index (1-based, from the inspection of `Master File` sheet)
COL = {
    "sr":          1,
    "circle":      2,
    "sdd_esu":     3,
    "name":        4,
    "ais_gis":     5,
    "capacity":    6,
    "tx_count":    7,
    "max_demand":  8,
    "demand_2030": 9,
    "demand_2035": 10,
    "swg33_type":  11,
    "swg33_model": 12,
    "swg11_type":  13,
    "swg11_model": 14,
    "req_new_ss":  15,
    "req_augment": 16,
    "tx_replace":  17,
    "merit_new":   18,
    "merit_upgrade": 19,
    "req_33kv":    20,
    "req_aerial":  21,
    "replace_33kv_cb": 22,
    "req_11kv":    23,
    "req_dt_315":  24,
    "req_dt_250":  25,
    "req_dt_200":  26,
    "req_rmu":     27,
}


def _slug(name):
    return re.sub(r"[^a-z0-9]+", "-", str(name).lower()).strip("-")


def _norm(name):
    """Normalise a substation name for fuzzy lookup.

    Bengali-to-English transliteration is inconsistent across documents
    (Meherchandi vs Meherchondi, Burirhut vs Burirhat, etc.), so on top
    of basic cleaning we apply common vowel-swap canonicalisation so
    that names which are obviously the same substation collapse to the
    same key.
    """
    if not name:
        return ""
    n = str(name).lower().strip()
    n = re.sub(r"\s*33[\s/]*11\s*k?v.*$", "", n)        # strip "33/11 KV" suffix
    n = re.sub(r"\s*gis\s*$", "", n)
    n = re.sub(r"\s*ss\s*$", "", n)
    n = re.sub(r"[^a-z0-9]", "", n)
    # Canonicalise common transliteration variants
    n = n.replace("hut", "hat")          # Burirhut → Burirhat
    n = n.replace("nogor", "nagar")      # Rahmannogor → Rahmannagar
    n = n.replace("nogar", "nagar")
    n = n.replace("bondor", "bandar")    # Bimanbondor → Bimanbandar
    n = re.sub(r"o", "a", n)             # rohon → rahan, chondi → chandi, etc.
    n = re.sub(r"y(?=[aeiu])", "i", n)   # chatiyani → chatiiani
    n = re.sub(r"ii+", "i", n)
    return n


def _match_existing(master_norm, by_norm):
    """Return an existing entry whose normalised name matches, or None.

    Uses both exact-match-after-norm and difflib's close-match (cutoff
    0.85) to absorb spelling drift like Meherchandi/Meherchondi.
    """
    if master_norm in by_norm:
        return by_norm[master_norm]
    candidates = difflib.get_close_matches(master_norm, by_norm.keys(), n=1, cutoff=0.85)
    return by_norm[candidates[0]] if candidates else None


# Manual aliases: when the master file uses a name that fuzzy matching
# can't reconcile with the curated JSON's name, map them here.
# Key   = name as it appears in the master file (raw, before _norm()).
# Value = name as it appears in the curated JSON (raw, before _norm()).
MASTER_NAME_ALIASES = {
    "Raypur":              "Raipur",
    "Niyamatpur, Saidpur": "Niyamotpur",
    "Talora":              "Talora Rural",
}


def _gather_ss_types():
    """Read NESCO Existing 33-11 kV SSs List Summary.xlsx → {norm_name: ss_type}.

    Header sits on row 14 in this workbook; substation name is column 4
    and SS Type is column 5. Values are AIS / GIS / Rural Type.
    """
    if not SS_TYPES.exists():
        return {}
    wb = open_wb(SS_TYPES)
    ws = wb["Summary"]
    out = {}
    for r in range(15, ws.max_row + 1):
        name = ws.cell(row=r, column=4).value
        ss_type = ws.cell(row=r, column=5).value
        if not name or not ss_type:
            continue
        nm = s(name)
        st = s(ss_type)
        if not nm or len(nm) < 3:
            continue
        # Skip the bottom summary rows (AIS SS / GIS SS / Rural Type / Total)
        if nm.lower() in ("ais ss", "gis ss", "rural type", "total ais"):
            continue
        out[_norm(nm)] = st
    return out


def _gather_master():
    """Read the Master File sheet → list of dicts."""
    wb = open_wb(MASTER)
    ws = wb["Master File"]
    rows = []
    for r in range(6, ws.max_row + 1):
        name = ws.cell(row=r, column=COL["name"]).value
        if not name:
            continue
        nm = s(name)
        if not nm:
            continue
        # Skip rows where the "name" cell is just a number or 2 chars or
        # less (artefact of merged-cell layout in some rows).
        if re.fullmatch(r"\d+(\.\d+)?", nm) or len(nm) < 3:
            continue
        rec = {
            "sr_master":    num(ws.cell(row=r, column=COL["sr"]).value),
            "circle":       s(ws.cell(row=r, column=COL["circle"]).value),
            "sdd_esu":      s(ws.cell(row=r, column=COL["sdd_esu"]).value),
            "name_master":  nm,
            "ais_gis":      s(ws.cell(row=r, column=COL["ais_gis"]).value),
            "capacity_mva": s(ws.cell(row=r, column=COL["capacity"]).value),
            "power_transformer_count": num(ws.cell(row=r, column=COL["tx_count"]).value),
            "max_demand_mw": num(ws.cell(row=r, column=COL["max_demand"]).value),
            "demand_2030_mw": num(ws.cell(row=r, column=COL["demand_2030"]).value),
            "demand_2035_mw": num(ws.cell(row=r, column=COL["demand_2035"]).value),
            "switchgear_33kv_type":  s(ws.cell(row=r, column=COL["swg33_type"]).value),
            "switchgear_33kv_model": s(ws.cell(row=r, column=COL["swg33_model"]).value),
            "switchgear_11kv_type":  s(ws.cell(row=r, column=COL["swg11_type"]).value),
            "switchgear_11kv_model": s(ws.cell(row=r, column=COL["swg11_model"]).value),
            "requirement_new_substation": s(ws.cell(row=r, column=COL["req_new_ss"]).value),
            "requirement_augmentation":   s(ws.cell(row=r, column=COL["req_augment"]).value),
            "power_transformer_replacement": s(ws.cell(row=r, column=COL["tx_replace"]).value),
            "merit_order_new_ss":       s(ws.cell(row=r, column=COL["merit_new"]).value),
            "merit_order_upgradation":  s(ws.cell(row=r, column=COL["merit_upgrade"]).value),
            "requirement_33kv_line":  s(ws.cell(row=r, column=COL["req_33kv"]).value),
            "requirement_aerial_cable": s(ws.cell(row=r, column=COL["req_aerial"]).value),
            "replacement_33kv_cb":    s(ws.cell(row=r, column=COL["replace_33kv_cb"]).value),
            "requirement_11kv_line":  s(ws.cell(row=r, column=COL["req_11kv"]).value),
            "requirement_dt_315kva":  s(ws.cell(row=r, column=COL["req_dt_315"]).value),
            "requirement_dt_250kva":  s(ws.cell(row=r, column=COL["req_dt_250"]).value),
            "requirement_dt_200kva":  s(ws.cell(row=r, column=COL["req_dt_200"]).value),
            "requirement_rmu":        s(ws.cell(row=r, column=COL["req_rmu"]).value),
        }
        rows.append(rec)
    return rows


def main():
    print(f"build_substations.py — reading {MASTER.name}")
    master = _gather_master()
    print(f"  master file has {len(master)} substations")

    ss_types = _gather_ss_types()
    if ss_types:
        print(f"  ss types file has {len(ss_types)} typed substations")

    existing = []
    if OUT.exists():
        existing = json.loads(OUT.read_text(encoding="utf-8"))
        print(f"  existing JSON has {len(existing)} substations")
    else:
        print("  no existing substations.json — creating from scratch")

    # Index existing by normalised name for fuzzy match
    by_norm = {}
    for ss in existing:
        key = _norm(ss.get("name") or ss.get("sheet_name") or "")
        if key:
            by_norm[key] = ss

    # Update existing + collect new
    updated = 0
    added = []
    # Master file has an accidental duplicate Kaliganj row — skip the
    # second occurrence so we don't double-update the same entry.
    seen_master_names = set()
    for m in master:
        nm = m["name_master"]
        if nm in seen_master_names:
            continue
        seen_master_names.add(nm)

        # Check manual alias first (cases fuzzy matching can't reconcile)
        alias_target = MASTER_NAME_ALIASES.get(nm)
        if alias_target:
            key = _norm(alias_target)
        else:
            key = _norm(nm)
        ss = _match_existing(key, by_norm)
        if ss is not None:
            # Augment with master fields (overwrite stale values)
            ss["circle"] = m["circle"]
            ss["sdd_esu"] = m["sdd_esu"] or ss.get("sdd_esu")
            ss["ais_gis"] = m["ais_gis"]
            ss["capacity_mva"] = m["capacity_mva"] or ss.get("capacity_mva")
            ss["power_transformer_count"] = m["power_transformer_count"]
            if m["max_demand_mw"] is not None:
                ss["max_demand_mw"] = m["max_demand_mw"]
            ss["demand_2030_mw"] = m["demand_2030_mw"]
            ss["demand_2035_mw"] = m["demand_2035_mw"]
            ss["switchgear_33kv_type"]  = m["switchgear_33kv_type"]
            ss["switchgear_33kv_model"] = m["switchgear_33kv_model"]
            ss["switchgear_11kv_type"]  = m["switchgear_11kv_type"]
            ss["switchgear_11kv_model"] = m["switchgear_11kv_model"]
            ss["requirement_new_substation"]  = m["requirement_new_substation"]
            ss["requirement_augmentation"]    = m["requirement_augmentation"]
            ss["power_transformer_replacement"] = m["power_transformer_replacement"]
            ss["merit_order_new_ss"]      = m["merit_order_new_ss"]
            ss["merit_order_upgradation"] = m["merit_order_upgradation"]
            ss["requirement_33kv_line"]   = m["requirement_33kv_line"]
            ss["requirement_aerial_cable"] = m["requirement_aerial_cable"]
            ss["replacement_33kv_cb"]     = m["replacement_33kv_cb"]
            ss["requirement_11kv_line"]   = m["requirement_11kv_line"]
            ss["requirement_dt_315kva"]   = m["requirement_dt_315kva"]
            ss["requirement_dt_250kva"]   = m["requirement_dt_250kva"]
            ss["requirement_dt_200kva"]   = m["requirement_dt_200kva"]
            ss["requirement_rmu"]         = m["requirement_rmu"]
            ss["last_updated_from_master"] = True
            updated += 1
        else:
            # New substation — create a stub entry
            stub = {
                "id":           _slug(m["name_master"]),
                "sheet_name":   m["name_master"],
                "name":         m["name_master"] + " 33/11 KV",
                "circle":       m["circle"],
                "sdd_esu":      m["sdd_esu"],
                "ais_gis":      m["ais_gis"],
                "capacity_mva": m["capacity_mva"],
                "power_transformer_count": m["power_transformer_count"],
                "max_demand_mw":  m["max_demand_mw"],
                "demand_2030_mw": m["demand_2030_mw"],
                "demand_2035_mw": m["demand_2035_mw"],
                "switchgear_33kv_type":  m["switchgear_33kv_type"],
                "switchgear_33kv_model": m["switchgear_33kv_model"],
                "switchgear_11kv_type":  m["switchgear_11kv_type"],
                "switchgear_11kv_model": m["switchgear_11kv_model"],
                "requirement_new_substation":   m["requirement_new_substation"],
                "requirement_augmentation":     m["requirement_augmentation"],
                "power_transformer_replacement": m["power_transformer_replacement"],
                "merit_order_new_ss":           m["merit_order_new_ss"],
                "merit_order_upgradation":      m["merit_order_upgradation"],
                "requirement_33kv_line":        m["requirement_33kv_line"],
                "requirement_aerial_cable":     m["requirement_aerial_cable"],
                "replacement_33kv_cb":          m["replacement_33kv_cb"],
                "requirement_11kv_line":        m["requirement_11kv_line"],
                "requirement_dt_315kva":        m["requirement_dt_315kva"],
                "requirement_dt_250kva":        m["requirement_dt_250kva"],
                "requirement_dt_200kva":        m["requirement_dt_200kva"],
                "requirement_rmu":              m["requirement_rmu"],
                "status":         "Online",
                "lines_33kv":     [],
                "power_transformers": [],
                "feeders_11kv":   [],
                "is_stub":        True,
            }
            existing.append(stub)
            added.append(stub["name"])

    # Drop curated entries that exist in the JSON but are not present in
    # the master file's operational summary at all. These are either old
    # decommissioned substations or split-row artifacts (e.g. Kathaltoli-2
    # which is actually the second power transformer of Kathaltoli, not a
    # separate substation). Per owner feedback the active count should be
    # 85/86, matching the master file's unique operational entries.
    DROP_ORPHAN_NAMES = {"Gomostapur", "Kathaltoli-2"}
    before = len(existing)
    existing = [s for s in existing if s.get("name") not in DROP_ORPHAN_NAMES]
    dropped = before - len(existing)
    if dropped:
        print(f"  dropped {dropped} curated-only orphan(s): {sorted(DROP_ORPHAN_NAMES)}")

    # Stamp ss_type from the "NESCO Existing 33-11 kV SSs List Summary"
    # workbook onto every entry that matches. Tries exact-norm match,
    # then the alias table (Raipur↔Raypur etc.), then difflib.
    typed = 0
    # Reverse alias map: curated name → master name
    reverse_aliases = {v: k for k, v in MASTER_NAME_ALIASES.items()}
    if ss_types:
        for ss in existing:
            ss_name = ss.get("name") or ss.get("sheet_name") or ""
            key = _norm(ss_name)
            if key in ss_types:
                ss["ss_type"] = ss_types[key]
                typed += 1
                continue
            # If the curated name has a reverse alias to the master name,
            # look up the master name in ss_types.
            # Strip the " 33/11 KV" suffix first to match the alias keys.
            stripped = re.sub(r"\s*33[\s/]*11\s*k?v.*$", "", ss_name, flags=re.I).strip()
            alias = reverse_aliases.get(stripped)
            if alias and _norm(alias) in ss_types:
                ss["ss_type"] = ss_types[_norm(alias)]
                typed += 1
                continue
            # difflib fallback for spelling drift
            cand = difflib.get_close_matches(key, ss_types.keys(), n=1, cutoff=0.80)
            if cand:
                ss["ss_type"] = ss_types[cand[0]]
                typed += 1
        print(f"  stamped ss_type on {typed} of {len(existing)} entries")

    OUT.write_text(json.dumps(existing, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"  updated {updated} existing entries · added {len(added)} new stubs")
    if added:
        print("  new substations:")
        for n in added:
            print(f"    - {n}")
    print(f"  wrote {OUT.name}  ({OUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
