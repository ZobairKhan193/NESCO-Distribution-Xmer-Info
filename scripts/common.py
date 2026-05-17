"""Shared helpers for all Excel -> JSON converters."""
import io
import json
import sys
from pathlib import Path

from openpyxl import load_workbook

# Force UTF-8 stdout (otherwise Bangla characters in cell values crash on
# Windows code page 1252 consoles).
if hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# Repository layout: this file lives at site/scripts/common.py, source Excel
# files live in folders next to ./site/.
ROOT = Path(__file__).resolve().parents[2]      # f:/NESCO Web Design
SITE = Path(__file__).resolve().parents[1]      # f:/NESCO Web Design/site


def open_wb(path: Path):
    if not path.exists():
        raise FileNotFoundError(path)
    return load_workbook(path, data_only=True, read_only=False)


def s(v):
    """Stringify a cell value, trimming whitespace; '' for None."""
    if v is None:
        return ""
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v).strip()


def num(v):
    """Coerce to float if possible, else None."""
    if v is None or v == "":
        return None
    if isinstance(v, (int, float)):
        return float(v)
    try:
        return float(str(v).replace(",", "").strip())
    except (ValueError, TypeError):
        return None


def write_json(name: str, payload):
    """Write payload to site/<name>.json (pretty-printed, UTF-8)."""
    out = SITE / name
    out.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    size = out.stat().st_size
    print(f"  wrote {name}  ({size:,} bytes)")
