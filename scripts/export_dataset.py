"""Export the chemical composition dataset as CSV and summary JSON.

Generates:
  exports/zamzam_chemical_dataset.csv — all measurements flat
  exports/zamzam_meta_analysis_summary.json — stats per element per source
  exports/README_dataset.md — dataset description
"""

import csv
import json
import os
import sys
from collections import defaultdict
from statistics import mean, stdev

sys.path.insert(0, ".")

EXPORTS_DIR = os.path.join(os.path.dirname(__file__), "..", "exports")
DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "reference", "manual_compositions.json")

os.makedirs(EXPORTS_DIR, exist_ok=True)


def load_data():
    with open(DATA_PATH) as f:
        return json.load(f)


def classify_water(source_id):
    zamzam_ids = {"bhardwaj_2023", "donia_2021", "shomar_2012", "al_gamal_2009", "zamzam_review_2025"}
    if source_id in zamzam_ids:
        return "zamzam"
    if source_id == "luxembourg_tap":
        return "tap_water"
    return "mineral_water"


def export_csv(data):
    rows = []
    for src in data["sources"]:
        water_type = classify_water(src["id"])
        for element, vals in src["elements"].items():
            rows.append({
                "element": element,
                "value": vals["value"],
                "unit": vals["unit"],
                "sample_source": src["sample_source"],
                "water_type": water_type,
                "year": src["year"],
                "method": src["method"],
                "location": src["sample_location"],
                "citation": src["citation"],
                "doi": src.get("doi") or "",
            })

    path = os.path.join(EXPORTS_DIR, "zamzam_chemical_dataset.csv")
    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)

    print(f"Exported {len(rows)} rows to {path}")
    return rows


def export_summary(data):
    # Group values by (sample_source, element)
    grouped = defaultdict(list)
    for src in data["sources"]:
        for element, vals in src["elements"].items():
            grouped[(src["sample_source"], element)].append(vals["value"])

    summary = {}
    for (source, element), values in sorted(grouped.items()):
        if source not in summary:
            summary[source] = {}
        entry = {
            "mean": round(mean(values), 6),
            "n": len(values),
        }
        if len(values) > 1:
            entry["std"] = round(stdev(values), 6)
            entry["min"] = min(values)
            entry["max"] = max(values)
            entry["cv_pct"] = round(stdev(values) / mean(values) * 100, 1) if mean(values) > 0 else 0
        summary[source][element] = entry

    path = os.path.join(EXPORTS_DIR, "zamzam_meta_analysis_summary.json")
    with open(path, "w") as f:
        json.dump(summary, f, indent=2)

    print(f"Exported summary ({len(summary)} sources) to {path}")
    return summary


def export_readme(data, row_count, summary):
    n_sources = len(data["sources"])
    all_elements = set()
    for src in data["sources"]:
        all_elements.update(src["elements"].keys())

    zamzam_sources = [s for s in data["sources"] if s["sample_source"] == "zamzam"]
    comparison_sources = [s for s in data["sources"] if s["sample_source"] != "zamzam"]

    path = os.path.join(EXPORTS_DIR, "README_dataset.md")
    with open(path, "w") as f:
        f.write("# Zamzam Water Chemical Composition Dataset\n\n")
        f.write("## Overview\n\n")
        f.write(f"- **Total measurements**: {row_count}\n")
        f.write(f"- **Sources**: {n_sources} ({len(zamzam_sources)} Zamzam studies + {len(comparison_sources)} comparison waters)\n")
        f.write(f"- **Elements**: {len(all_elements)} distinct parameters\n")
        f.write(f"- **Temporal coverage**: {min(s['year'] for s in data['sources'])}–{max(s['year'] for s in data['sources'])}\n\n")

        f.write("## Zamzam studies\n\n")
        for s in zamzam_sources:
            f.write(f"- {s['citation']} — {s['method']}")
            if s.get("doi"):
                f.write(f" (DOI: {s['doi']})")
            f.write("\n")

        f.write("\n## Comparison waters\n\n")
        for s in comparison_sources:
            f.write(f"- {s['citation']} — {s['sample_location']}\n")

        f.write("\n## Files\n\n")
        f.write("| File | Description |\n|------|-------------|\n")
        f.write("| `zamzam_chemical_dataset.csv` | All measurements (element, value, unit, source, year, method) |\n")
        f.write("| `zamzam_meta_analysis_summary.json` | Per-source per-element statistics (mean, std, CV) |\n")
        f.write("| `README_dataset.md` | This file |\n\n")

        f.write("## Citation\n\n")
        f.write("If you use this dataset, please cite:\n\n")
        f.write("> zamzam-research project (2026). Zamzam water chemical composition dataset: ")
        f.write("a multi-source independent assessment. https://github.com/nabz0r/zamzam-research\n\n")

        f.write("## License\n\nMIT — Open data for open science.\n")

    print(f"Exported README to {path}")


def main():
    data = load_data()
    rows = export_csv(data)
    summary = export_summary(data)
    export_readme(data, len(rows), summary)
    print(f"\nDone. {len(rows)} measurements from {len(data['sources'])} sources.")


if __name__ == "__main__":
    main()
