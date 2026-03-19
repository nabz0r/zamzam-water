"""Extract chemical values from publication abstracts using regex patterns.

Patterns matched:
  - "Ca 93 mg/L", "calcium 93.0 mg/L"
  - "Ca (93 +/- 0.09 mg/L)", "calcium (93±0.09 mg/L)"
  - "pH 7.9-8.0", "pH = 7.95"
  - "TDS 814 mg/L", "TDS of 814 mg/L"
  - "arsenic 0.006 ug/L", "As: 0.006 µg/L"
"""

import re
import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from api.database import sync_engine
from api.models.chemical_analysis import ChemicalAnalysis
from api.models.publication import Publication

# Element name → symbol mapping
ELEMENT_NAMES = {
    "calcium": "Ca", "magnesium": "Mg", "sodium": "Na", "potassium": "K",
    "chloride": "Cl", "chlorine": "Cl", "sulfate": "SO4", "sulphate": "SO4",
    "bicarbonate": "HCO3", "nitrate": "NO3", "fluoride": "F", "fluorine": "F",
    "iron": "Fe", "copper": "Cu", "zinc": "Zn", "manganese": "Mn",
    "chromium": "Cr", "nickel": "Ni", "arsenic": "As", "lead": "Pb",
    "cadmium": "Cd", "barium": "Ba", "strontium": "Sr", "lithium": "Li",
    "silica": "SiO2", "silicon": "SiO2",
    "tds": "TDS", "total dissolved solids": "TDS",
    "conductivity": "EC", "electrical conductivity": "EC",
}

SYMBOLS = {
    "Ca", "Mg", "Na", "K", "Cl", "SO4", "HCO3", "NO3", "F", "Fe", "Cu", "Zn",
    "Mn", "Cr", "Ni", "As", "Pb", "Cd", "Ba", "Sr", "Li", "SiO2", "TDS", "EC",
    "pH", "Al",
}

UNIT_MAP = {
    "mg/l": "mg/L", "mg/L": "mg/L", "mg l-1": "mg/L", "mg L-1": "mg/L",
    "ug/l": "µg/L", "ug/L": "µg/L", "µg/l": "µg/L", "µg/L": "µg/L",
    "μg/l": "µg/L", "μg/L": "µg/L",
    "us/cm": "µS/cm", "µs/cm": "µS/cm", "μs/cm": "µS/cm",
    "ppm": "mg/L", "ppb": "µg/L",
}

# Regex patterns for value extraction
# Pattern 1: "Element value unit" — e.g. "Ca 93 mg/L", "calcium 93.0 mg/L"
# Pattern 2: "Element (value ± error unit)" — e.g. "Ca (93±0.09 mg/L)"
# Pattern 3: "Element = value unit" — e.g. "pH = 7.95"
# Pattern 4: "Element: value unit" — e.g. "As: 0.006 µg/L"
# Pattern 5: "Element of value unit" — e.g. "TDS of 814 mg/L"
# Pattern 6: "Element value-value unit" (range) — take midpoint

_element_pat = "|".join(
    [re.escape(s) for s in sorted(SYMBOLS, key=len, reverse=True)]
    + [re.escape(n) for n in sorted(ELEMENT_NAMES.keys(), key=len, reverse=True)]
)
_unit_pat = "|".join(re.escape(u) for u in sorted(UNIT_MAP.keys(), key=len, reverse=True))
_unit_pat += r"|mg/L|µg/L|μg/L|mg l-1|mg L-1|ppm|ppb|µS/cm"

_num = r"(\d+\.?\d*)"
_sep = r"[\s:=]*(?:of\s+|was\s+|were\s+)?"

PATTERNS = [
    # "Element (value ± error unit)" — use value, discard error
    ("plusminus", re.compile(
        rf"(?i)\b({_element_pat})\s*\(?{_num}\s*[±]+\s*{_num}\s*({_unit_pat})\)?",
    )),
    # "Element value-value unit" (range → midpoint)
    ("range", re.compile(
        rf"(?i)\b({_element_pat}){_sep}{_num}\s*[-–]\s*{_num}\s+({_unit_pat})",
    )),
    # "Element value unit"
    ("simple", re.compile(
        rf"(?i)\b({_element_pat}){_sep}{_num}\s+({_unit_pat})\b",
    )),
]

# Simpler pH pattern
PH_PATTERN = re.compile(r"(?i)\bpH\s*[:=]?\s*(\d+\.?\d*)")
PH_RANGE_PATTERN = re.compile(r"(?i)\bpH\s*[:=]?\s*(\d+\.?\d*)\s*[-–]\s*(\d+\.?\d*)")


def normalize_element(name: str) -> str | None:
    """Convert element name/symbol to canonical symbol."""
    upper = name.strip()
    if upper in SYMBOLS:
        return upper
    lower = name.strip().lower()
    return ELEMENT_NAMES.get(lower)


def normalize_unit(unit: str) -> str:
    """Normalize unit string."""
    return UNIT_MAP.get(unit, unit)


def extract_from_text(text: str) -> list[dict]:
    """Extract chemical values from a text string."""
    results = []
    seen = set()

    # pH range
    for m in PH_RANGE_PATTERN.finditer(text):
        low, high = float(m.group(1)), float(m.group(2))
        mid = round((low + high) / 2, 2)
        if 4.0 <= mid <= 11.0 and "pH" not in seen:
            results.append({"element": "pH", "value": mid, "unit": "-"})
            seen.add("pH")

    # pH single
    if "pH" not in seen:
        for m in PH_PATTERN.finditer(text):
            val = float(m.group(1))
            if 4.0 <= val <= 11.0:
                results.append({"element": "pH", "value": val, "unit": "-"})
                seen.add("pH")
                break

    # Other patterns
    for pat_type, pat in PATTERNS:
        for m in pat.finditer(text):
            groups = m.groups()
            if len(groups) == 4:
                elem_raw, val1, val2, unit = groups
                if pat_type == "plusminus":
                    # value ± error → use value only
                    val = float(val1)
                else:
                    # range → midpoint
                    val = round((float(val1) + float(val2)) / 2, 6)
            elif len(groups) == 3:
                elem_raw, val_str, unit = groups
                val = float(val_str)
            else:
                continue

            elem = normalize_element(elem_raw)
            if not elem or elem in seen:
                continue

            unit = normalize_unit(unit)

            # Sanity checks
            if elem == "TDS" and (val < 1 or val > 100000):
                continue
            if elem == "pH":
                continue  # handled above
            if val < 0:
                continue

            results.append({"element": elem, "value": val, "unit": unit})
            seen.add(elem)

    return results


def run_abstract_extraction() -> dict:
    """Extract chemical values from all relevant publication abstracts."""
    from sqlalchemy.orm import Session as SyncSession

    with SyncSession(sync_engine) as session:
        # Get relevant publications with abstracts
        query = (
            select(Publication)
            .where(Publication.is_relevant == True)
            .where(Publication.abstract.isnot(None))
            .where(Publication.abstract != "")
        )
        pubs = session.execute(query).scalars().all()

        total_new = 0
        total_pubs_with_data = 0

        for pub in pubs:
            extracted = extract_from_text(pub.abstract)
            if not extracted:
                continue

            new_for_pub = 0
            for item in extracted:
                # Check if we already have this exact measurement
                exists = session.execute(
                    select(ChemicalAnalysis)
                    .where(ChemicalAnalysis.element == item["element"])
                    .where(ChemicalAnalysis.value == item["value"])
                    .where(ChemicalAnalysis.source == "abstract_extraction")
                    .where(ChemicalAnalysis.publication_doi == pub.doi)
                ).scalar_one_or_none()

                if exists:
                    continue

                analysis = ChemicalAnalysis(
                    id=uuid.uuid4(),
                    sample_source="zamzam",
                    element=item["element"],
                    value=item["value"],
                    unit=item["unit"],
                    analytical_method="abstract_extraction",
                    sample_location="Extracted from abstract",
                    publication_doi=pub.doi,
                    publication_year=pub.year,
                    source="abstract_extraction",
                    notes=f"Regex-extracted from: {pub.title[:100]}",
                )
                session.add(analysis)
                new_for_pub += 1

            if new_for_pub > 0:
                total_pubs_with_data += 1
                total_new += new_for_pub

        session.commit()

    return {
        "abstracts_scanned": len(pubs),
        "publications_with_data": total_pubs_with_data,
        "new_values_extracted": total_new,
    }
