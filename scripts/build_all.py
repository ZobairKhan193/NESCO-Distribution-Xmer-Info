"""
Regenerate every JSON data file from the latest Excel/Word sources.

Run from the repository root:

    py -3 scripts/build_all.py

Each builder is independent — failures in one don't block the others.
"""
import importlib
import sys
import traceback

BUILDERS = [
    "build_homepage",
    "build_zrs",
    "build_store",
    "build_switching",
    "build_projects",
    "build_renewable",
]


def main():
    failed = []
    for name in BUILDERS:
        print(f"\n=== {name} ===")
        try:
            mod = importlib.import_module(name)
            mod.main()
        except Exception:
            traceback.print_exc()
            failed.append(name)
    if failed:
        print(f"\n!!! {len(failed)} builder(s) FAILED: {', '.join(failed)}")
        sys.exit(1)
    print("\nAll builders finished successfully.")


if __name__ == "__main__":
    main()
