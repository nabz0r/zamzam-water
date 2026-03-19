# Contributing to zamzam-research

## Stack

- **Backend**: FastAPI + SQLAlchemy 2.0 (async) + Alembic + PostgreSQL 16 + pgvector
- **Queue**: Celery + Redis
- **Frontend**: React + Vite + Tailwind CSS + Recharts + Leaflet
- **Containers**: Docker Compose

## Setup

```bash
make setup      # docker + deps + migrate + seed
make api        # FastAPI at :8000
make dashboard  # Vite at :5173
```

## Adding a new water source

1. Edit `data/reference/manual_compositions.json` — add an entry to the `sources` array:

```json
{
  "id": "brand_name",
  "citation": "Brand Name (official label)",
  "doi": null,
  "year": 2024,
  "method": "Manufacturer label",
  "sample_location": "City, Country",
  "sample_source": "brand_name",
  "elements": {
    "pH": {"value": 7.0, "unit": "-"},
    "TDS": {"value": 500.0, "unit": "mg/L"},
    "Ca": {"value": 80.0, "unit": "mg/L"},
    "Mg": {"value": 20.0, "unit": "mg/L"},
    "Na": {"value": 10.0, "unit": "mg/L"},
    "K": {"value": 2.0, "unit": "mg/L"},
    "Cl": {"value": 15.0, "unit": "mg/L"},
    "SO4": {"value": 30.0, "unit": "mg/L"},
    "HCO3": {"value": 200.0, "unit": "mg/L"}
  }
}
```

2. Re-seed the database: `make seed`
3. Add color + label in `dashboard/src/components/ChemExplorer.jsx` (`SOURCE_COLORS` and `SOURCE_LABELS`)
4. Regenerate exports: `make export`
5. Validate: `python3 -c "import json; d=json.load(open('data/reference/manual_compositions.json')); print(len(d['sources']), 'sources')"`

## Adding an archaeological site

1. Add the site in `scripts/seed_known_data.py` in the `seed_archaeology()` function
2. Fields: `name`, `name_ar` (Arabic), `latitude`, `longitude`, `site_type`, `period`, `quran_reference`, `evidence_status` (one of: confirmed, probable, possible, disputed, unlocated), `description`, `source`
3. Re-seed: `make seed`

## Running tests

```bash
make test       # curl-based endpoint smoke tests (requires running API)
```

## Database migrations

Every model change needs a migration:

```bash
PYTHONPATH=. alembic revision --autogenerate -m "description"
PYTHONPATH=. alembic upgrade head
```

Or: `make migrate msg="description"`

## Code style

- Python: black, isort, type hints
- React: functional components, hooks only
- Commits: conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`)
- Use `python3` (not `python`) for macOS compatibility

## Data standards

- All chemical values cited with DOI, year, method, and sample location
- Units: mg/L for major/minor elements, µg/L for trace metals, µS/cm for EC
- WHO limits reference: Guidelines for Drinking-water Quality, 4th ed (2011 + amendments)
