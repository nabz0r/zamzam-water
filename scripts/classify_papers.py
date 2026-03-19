"""Classify publications as relevant/not relevant to Zamzam water research.

Marks papers as relevant if title or abstract mentions Zamzam water/well.
Many PubMed results are false positives (people named Zamzam, Somali cities, etc).
"""

import re
import sys

from sqlalchemy import create_engine, update
from sqlalchemy.orm import Session

sys.path.insert(0, ".")
from api.config import settings
from api.models.publication import Publication

# Patterns that indicate genuine Zamzam water research
RELEVANT_PATTERNS = [
    r"zamzam\s+water",
    r"zamzam\s+well",
    r"zam[\s-]?zam\s+water",
    r"zam[\s-]?zam\s+well",
    r"زمزم",  # Arabic
    r"holy\s+water.*mecca",
    r"mecca.*drinking\s+water",
    r"zamzam.*mineral",
    r"zamzam.*chemical",
    r"zamzam.*composition",
    r"zamzam.*quality",
    r"zamzam.*hydroch",
    r"zamzam.*isotop",
    r"zamzam.*aquifer",
]

COMPILED = re.compile("|".join(RELEVANT_PATTERNS), re.IGNORECASE)


def classify(title: str, abstract: str | None) -> bool:
    """Return True if paper is about Zamzam water research."""
    text = f"{title or ''} {abstract or ''}"
    return bool(COMPILED.search(text))


def main():
    engine = create_engine(settings.database_url_sync)

    with Session(engine) as session:
        pubs = session.query(Publication).all()
        relevant = 0
        not_relevant = 0

        for pub in pubs:
            is_rel = classify(pub.title, pub.abstract)
            pub.is_relevant = is_rel
            if is_rel:
                relevant += 1
            else:
                not_relevant += 1

        session.commit()
        print(f"Classified {len(pubs)} papers: {relevant} relevant, {not_relevant} not relevant")


if __name__ == "__main__":
    main()
