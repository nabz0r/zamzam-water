"""PDF full-text parser for Zamzam water publications.

Downloads open-access PDFs via Unpaywall, extracts text with PyMuPDF,
parses chemical concentration tables, and stores extracted values.
"""

import re
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

import httpx
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from api.config import settings
from api.models.chemical_analysis import ChemicalAnalysis
from api.models.publication import Publication
from api.services.pubmed_scraper import ELEMENT_ALIASES, ELEMENT_SYMBOLS, extract_chemical_values

UNPAYWALL_EMAIL = "zamzam-research@example.com"
PDF_DIR = Path("data/papers")


def get_open_access_url(doi: str) -> Optional[str]:
    """Check Unpaywall for an open-access PDF URL."""
    if not doi:
        return None
    try:
        resp = httpx.get(
            f"https://api.unpaywall.org/v2/{doi}",
            params={"email": settings.entrez_email or UNPAYWALL_EMAIL},
            timeout=15.0,
        )
        if resp.status_code != 200:
            return None
        data = resp.json()
        # Try best OA location first
        best_oa = data.get("best_oa_location", {})
        if best_oa and best_oa.get("url_for_pdf"):
            return best_oa["url_for_pdf"]
        # Try any OA location
        for loc in data.get("oa_locations", []):
            if loc.get("url_for_pdf"):
                return loc["url_for_pdf"]
    except Exception:
        pass
    return None


def download_pdf(url: str, doi: str) -> Optional[Path]:
    """Download a PDF to data/papers/."""
    PDF_DIR.mkdir(parents=True, exist_ok=True)
    safe_name = re.sub(r"[^\w\-.]", "_", doi) + ".pdf"
    filepath = PDF_DIR / safe_name

    if filepath.exists():
        return filepath

    try:
        resp = httpx.get(url, timeout=60.0, follow_redirects=True)
        if resp.status_code == 200 and len(resp.content) > 1000:
            filepath.write_bytes(resp.content)
            return filepath
    except Exception:
        pass
    return None


def extract_text_pymupdf(pdf_path: Path) -> str:
    """Extract full text from PDF using PyMuPDF."""
    try:
        import fitz  # PyMuPDF
    except ImportError:
        print("PyMuPDF not installed. Run: pip install PyMuPDF")
        return ""

    text_parts = []
    doc = fitz.open(str(pdf_path))
    for page in doc:
        text_parts.append(page.get_text())
    doc.close()
    return "\n".join(text_parts)


def extract_tables_tabula(pdf_path: Path) -> list[list[list[str]]]:
    """Extract tables from PDF using tabula-py.

    Returns list of tables, each table is a list of rows (list of cells).
    """
    try:
        import tabula
    except ImportError:
        print("tabula-py not installed. Run: pip install tabula-py")
        return []

    try:
        tables = tabula.read_pdf(
            str(pdf_path),
            pages="all",
            multiple_tables=True,
            silent=True,
        )
        result = []
        for df in tables:
            rows = []
            # Include header
            rows.append([str(c) for c in df.columns.tolist()])
            for _, row in df.iterrows():
                rows.append([str(v) for v in row.tolist()])
            result.append(rows)
        return result
    except Exception:
        return []


def extract_chemical_from_tables(tables: list[list[list[str]]]) -> list[dict]:
    """Parse chemical concentrations from extracted table data.

    Handles common table formats:
    - Column headers containing element names/symbols
    - Rows with element names and concentration values
    """
    results = []
    seen = set()

    for table in tables:
        if len(table) < 2:
            continue

        header = [h.lower().strip() for h in table[0]]

        # Strategy 1: header has element names as columns
        # e.g. ["Parameter", "Ca", "Mg", "Na", ...]
        element_cols = {}
        for i, h in enumerate(header):
            # Check if header matches an element symbol
            h_clean = h.replace("(mg/l)", "").replace("(µg/l)", "").strip()
            if h_clean.upper() in ELEMENT_SYMBOLS or h_clean.upper() in {"PH"}:
                element_cols[i] = h_clean.upper()
            elif h_clean in ELEMENT_ALIASES:
                element_cols[i] = ELEMENT_ALIASES[h_clean]

        if element_cols:
            for row in table[1:]:
                for col_idx, element in element_cols.items():
                    if col_idx < len(row):
                        val_str = row[col_idx].strip()
                        val_str = re.sub(r"[<>±~]", "", val_str).strip()
                        try:
                            value = float(val_str)
                            unit = _guess_unit(element, header, col_idx)
                            key = (element, value, unit)
                            if key not in seen:
                                seen.add(key)
                                results.append({"element": element, "value": value, "unit": unit})
                        except (ValueError, TypeError):
                            continue
            continue

        # Strategy 2: first column has element names, second has values
        # e.g. ["Element", "Concentration"], ["Ca", "93.5"], ...
        for row in table[1:]:
            if len(row) < 2:
                continue
            elem_str = row[0].strip()
            val_str = row[1].strip() if len(row) > 1 else ""
            unit_str = row[2].strip() if len(row) > 2 else ""

            element = None
            if elem_str.upper() in ELEMENT_SYMBOLS or elem_str.upper() in {"PH"}:
                element = elem_str if elem_str == "pH" else elem_str.upper()
            elif elem_str.lower() in ELEMENT_ALIASES:
                element = ELEMENT_ALIASES[elem_str.lower()]

            if element:
                val_str = re.sub(r"[<>±~]", "", val_str).strip()
                try:
                    value = float(val_str)
                    unit = unit_str if unit_str and unit_str != "nan" else _guess_unit(element)
                    key = (element, value, unit)
                    if key not in seen:
                        seen.add(key)
                        results.append({"element": element, "value": value, "unit": unit})
                except (ValueError, TypeError):
                    continue

    return results


def _guess_unit(element: str, header: list[str] = None, col_idx: int = None) -> str:
    """Guess the unit based on element and header context."""
    if element == "pH":
        return "-"
    if element in {"As", "Pb", "Cd", "Cr", "Ni", "Se"}:
        return "µg/L"
    # Check if header has unit info
    if header and col_idx is not None:
        h = header[col_idx].lower()
        if "µg" in h or "ug" in h or "μg" in h or "ppb" in h:
            return "µg/L"
        if "mg" in h or "ppm" in h:
            return "mg/L"
    return "mg/L"


def run_pdf_parser(session: Optional[Session] = None) -> dict:
    """Run the PDF parsing pipeline on Zamzam-titled publications.

    Returns stats dict.
    """
    own_session = False
    if session is None:
        engine = create_engine(settings.database_url_sync)
        session = Session(engine)
        own_session = True

    try:
        stats = {
            "papers_checked": 0,
            "pdfs_found": 0,
            "pdfs_downloaded": 0,
            "values_from_text": 0,
            "values_from_tables": 0,
        }

        # Get Zamzam-titled papers with DOIs
        pubs = session.execute(
            select(Publication).where(
                Publication.title.ilike("%zamzam%"),
                Publication.doi.isnot(None),
            )
        ).scalars().all()
        stats["papers_checked"] = len(pubs)

        for pub in pubs:
            # Check Unpaywall for open-access PDF
            pdf_url = get_open_access_url(pub.doi)
            if not pdf_url:
                continue
            stats["pdfs_found"] += 1

            # Download PDF
            pdf_path = download_pdf(pdf_url, pub.doi)
            if not pdf_path:
                continue
            stats["pdfs_downloaded"] += 1

            # Update publication with PDF path
            pub.pdf_path = str(pdf_path)

            # Extract full text
            full_text = extract_text_pymupdf(pdf_path)
            if full_text:
                text_values = extract_chemical_values(full_text)
                for cv in text_values:
                    _store_analysis(session, cv, pub, source="pdf_text")
                    stats["values_from_text"] += 1

            # Extract tables
            tables = extract_tables_tabula(pdf_path)
            if tables:
                table_values = extract_chemical_from_tables(tables)
                for cv in table_values:
                    _store_analysis(session, cv, pub, source="pdf_table")
                    stats["values_from_tables"] += 1

        session.commit()
        return stats

    finally:
        if own_session:
            session.close()


def _store_analysis(session: Session, cv: dict, pub: Publication, source: str):
    """Store a chemical analysis extracted from a PDF."""
    analysis = ChemicalAnalysis(
        id=uuid.uuid4(),
        sample_source="zamzam",
        element=cv["element"],
        value=cv["value"],
        unit=cv["unit"],
        publication_doi=pub.doi,
        publication_year=pub.year,
        source=source,
        notes=f"Extracted from PDF of PMID:{pub.pmid}",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    session.add(analysis)
