"""PubMed scraper for Zamzam water publications.

Uses Biopython Entrez to search and fetch paper metadata,
then extracts chemical concentrations from abstracts via regex.
"""

import re
import uuid
from datetime import datetime
from typing import Optional

from Bio import Entrez, Medline
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from api.config import settings
from api.models.chemical_analysis import ChemicalAnalysis
from api.models.publication import Publication

SEARCH_TERMS = [
    "Zamzam water",
    "Zamzam well",
    "Zamzam chemical",
    "Zamzam hydrogeology",
]

# Regex patterns for chemical concentrations in abstracts
# Matches patterns like: "Ca 93 mg/L", "calcium 93.5 mg/L", "pH 7.9", "arsenic 0.006 µg/L"
ELEMENT_ALIASES = {
    "calcium": "Ca",
    "magnesium": "Mg",
    "sodium": "Na",
    "potassium": "K",
    "chloride": "Cl",
    "fluoride": "F",
    "lithium": "Li",
    "arsenic": "As",
    "lead": "Pb",
    "cadmium": "Cd",
    "iron": "Fe",
    "zinc": "Zn",
    "copper": "Cu",
    "manganese": "Mn",
    "chromium": "Cr",
    "nickel": "Ni",
    "selenium": "Se",
    "barium": "Ba",
    "strontium": "Sr",
    "sulfate": "SO4",
    "nitrate": "NO3",
    "bicarbonate": "HCO3",
    "phosphate": "PO4",
    "silica": "SiO2",
    "tds": "TDS",
    "total dissolved solids": "TDS",
}

# All recognized element symbols
ELEMENT_SYMBOLS = {
    "Ca", "Mg", "Na", "K", "Cl", "F", "Li", "As", "Pb", "Cd",
    "Fe", "Zn", "Cu", "Mn", "Cr", "Ni", "Se", "Ba", "Sr",
    "SO4", "NO3", "HCO3", "PO4", "SiO2", "TDS", "pH",
}

# Units we recognize
UNITS_PATTERN = r"(?:mg/[Ll]|µg/[Ll]|ug/[Ll]|μg/[Ll]|ppm|ppb|meq/[Ll])"

# Pattern: element/name followed by value and optional unit
CONCENTRATION_PATTERN = re.compile(
    r"(?:^|[\s,;(])"
    r"("
    # Element symbols (Ca, Mg, Na, pH, TDS, etc.)
    + "|".join(re.escape(s) for s in sorted(ELEMENT_SYMBOLS, key=len, reverse=True))
    + r"|"
    # Full element names
    + "|".join(re.escape(n) for n in sorted(ELEMENT_ALIASES.keys(), key=len, reverse=True))
    + r")"
    r"[\s:=]*"
    r"([<>]?\s*\d+\.?\d*)"
    r"\s*"
    r"(" + UNITS_PATTERN + r")?"
    r"(?:[\s,;).]|$)",
    re.IGNORECASE,
)


def extract_chemical_values(
    text: str,
) -> list[dict]:
    """Extract chemical concentrations from text (abstract).

    Returns list of dicts with keys: element, value, unit
    """
    results = []
    seen = set()

    for match in CONCENTRATION_PATTERN.finditer(text):
        raw_element = match.group(1).strip()
        raw_value = match.group(2).strip().lstrip("<>").strip()
        raw_unit = match.group(3) or ""

        # Normalize element name
        element = ELEMENT_ALIASES.get(raw_element.lower(), raw_element)
        if element not in ELEMENT_SYMBOLS:
            continue

        try:
            value = float(raw_value)
        except ValueError:
            continue

        # Normalize unit
        unit = raw_unit.strip()
        if not unit:
            if element == "pH":
                unit = "-"
            elif element == "TDS":
                unit = "mg/L"
            else:
                unit = "mg/L"
        unit = unit.replace("ug/L", "µg/L").replace("μg/L", "µg/L")

        key = (element, value, unit)
        if key not in seen:
            seen.add(key)
            results.append({"element": element, "value": value, "unit": unit})

    return results


def _configure_entrez():
    """Set Entrez email and API key from settings."""
    Entrez.email = settings.entrez_email or "zamzam-research@example.com"
    if settings.entrez_api_key:
        Entrez.api_key = settings.entrez_api_key


def search_pubmed(term: str, max_results: int = 100) -> list[str]:
    """Search PubMed for a term, return list of PMIDs."""
    _configure_entrez()
    handle = Entrez.esearch(db="pubmed", term=term, retmax=max_results)
    record = Entrez.read(handle)
    handle.close()
    return record.get("IdList", [])


def fetch_papers(pmids: list[str]) -> list[dict]:
    """Fetch paper details from PubMed by PMIDs."""
    if not pmids:
        return []

    _configure_entrez()
    handle = Entrez.efetch(db="pubmed", id=",".join(pmids), rettype="medline", retmode="text")
    records = list(Medline.parse(handle))
    handle.close()

    papers = []
    for rec in records:
        # Extract DOI from article identifiers
        doi = None
        aid_list = rec.get("AID", [])
        for aid in aid_list:
            if "[doi]" in aid:
                doi = aid.replace(" [doi]", "")
                break

        # Extract year
        dp = rec.get("DP", "")
        year = None
        year_match = re.match(r"(\d{4})", dp)
        if year_match:
            year = int(year_match.group(1))

        papers.append({
            "pmid": rec.get("PMID", ""),
            "title": rec.get("TI", ""),
            "authors": "; ".join(rec.get("AU", [])),
            "journal": rec.get("JT", "") or rec.get("TA", ""),
            "year": year,
            "doi": doi,
            "abstract": rec.get("AB", ""),
        })

    return papers


def run_scraper(session: Optional[Session] = None) -> dict:
    """Run the full PubMed scraper pipeline.

    Returns stats dict with counts of papers and chemical values found.
    """
    own_session = False
    if session is None:
        engine = create_engine(settings.database_url_sync)
        session = Session(engine)
        own_session = True

    try:
        stats = {"papers_found": 0, "papers_new": 0, "chemical_values_extracted": 0}

        # Collect all unique PMIDs across search terms
        all_pmids = set()
        for term in SEARCH_TERMS:
            pmids = search_pubmed(term)
            all_pmids.update(pmids)

        stats["papers_found"] = len(all_pmids)

        if not all_pmids:
            return stats

        # Filter out already-stored PMIDs
        existing = session.execute(
            select(Publication.pmid).where(Publication.pmid.in_(list(all_pmids)))
        )
        existing_pmids = {row[0] for row in existing}
        new_pmids = list(all_pmids - existing_pmids)

        if not new_pmids:
            return stats

        # Fetch metadata for new papers
        papers = fetch_papers(new_pmids)

        for paper in papers:
            pub = Publication(
                id=uuid.uuid4(),
                title=paper["title"],
                authors=paper["authors"],
                journal=paper["journal"],
                year=paper["year"],
                doi=paper["doi"],
                pmid=paper["pmid"],
                abstract=paper["abstract"],
                source="pubmed",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            session.add(pub)
            stats["papers_new"] += 1

            # Extract chemical values from abstract
            if paper["abstract"]:
                chem_values = extract_chemical_values(paper["abstract"])
                for cv in chem_values:
                    analysis = ChemicalAnalysis(
                        id=uuid.uuid4(),
                        sample_source="zamzam",
                        element=cv["element"],
                        value=cv["value"],
                        unit=cv["unit"],
                        publication_doi=paper["doi"],
                        publication_year=paper["year"],
                        source="pubmed_abstract",
                        notes=f"Auto-extracted from abstract of PMID:{paper['pmid']}",
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow(),
                    )
                    session.add(analysis)
                    stats["chemical_values_extracted"] += 1

        session.commit()
        return stats

    finally:
        if own_session:
            session.close()
