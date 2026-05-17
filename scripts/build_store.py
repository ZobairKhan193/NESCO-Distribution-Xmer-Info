"""
Build site/store.json from the two equipment workbooks under Store/.

Source sheets are plain row-oriented inventories with category-only header
rows (Voltage / Current / Unit / Quantity are blank on the category row;
the next several rows are concrete items under that category).
"""
from common import ROOT, open_wb, num, s, write_json

SS_SRC   = ROOT / "Store" / "NESCO_Substation_Equipment_List.xlsx"
LINE_SRC = ROOT / "Store" / "NESCO_Line_Equipment_List.xlsx"


def parse_substation_equipment():
    wb = open_wb(SS_SRC)
    ws = wb["Equipment List"]
    headers = [s(c.value) for c in ws[1]]    # Equipment Name | Voltage | Rating | Unit | Quantity
    items, category = [], None
    for r in ws.iter_rows(min_row=2, values_only=True):
        if not r or not s(r[0]):
            continue
        name, voltage, rating, unit, qty = (s(r[0]), s(r[1]), s(r[2]), s(r[3]), num(r[4]))
        # A "category" row has the name filled but the rest blank.
        if not voltage and not rating and not unit and qty is None:
            category = name
            continue
        items.append({
            "category": category,
            "name": name,
            "voltage_class": voltage,
            "rating": rating,
            "unit": unit,
            "quantity": qty,
        })
    return {"headers": headers, "items": items}


def parse_line_equipment():
    wb = open_wb(LINE_SRC)
    ws = wb["Line Equipment List"]
    headers = [s(c.value) for c in ws[1]]    # Equipment Name | Voltage | Description | Unit | Quantity
    items, category = [], None
    for r in ws.iter_rows(min_row=2, values_only=True):
        if not r or not s(r[0]):
            continue
        name, voltage, desc, unit, qty = (s(r[0]), s(r[1]), s(r[2]), s(r[3]), num(r[4]))
        if not voltage and not desc and not unit and qty is None:
            category = name
            continue
        items.append({
            "category": category,
            "name": name,
            "voltage_class": voltage,
            "description": desc,
            "unit": unit,
            "quantity": qty,
        })
    return {"headers": headers, "items": items}


def main():
    print("build_store.py — reading substation & line equipment lists")
    payload = {
        "substation_equipment": parse_substation_equipment(),
        "line_equipment":       parse_line_equipment(),
    }
    write_json("store.json", payload)


if __name__ == "__main__":
    main()
