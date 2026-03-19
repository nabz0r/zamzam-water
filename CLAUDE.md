# CLAUDE.md — Project context for Claude Code

## Project overview

zamzam-research is an independent scientific research platform for analyzing Zamzam water.
The goal is to build the most comprehensive open dataset combining published literature,
satellite remote sensing, hydrogeological data, and independent lab analyses.

Secondary objective: catalog all Quranic archaeological sites with evidence status.

## Developer context

- **Developer**: Nabil (nabz0r) — network/security engineer, Master in Mathematics (Sorbonne)
- **Communication style**: French, casual, direct. No fluff.
- **Primary OS**: macOS
- **Preferred stack**: FastAPI + Celery + Redis + PostgreSQL + React (same as HexWGuard project)
- **AI/ML**: Ollama with Qwen2.5 for local LLM tasks (semantic search, paper extraction)
- **Containers**: Docker Compose for everything

## Tech decisions (locked)

- **Backend**: FastAPI + SQLAlchemy 2.0 (async) + Alembic migrations
- **Queue**: Celery with Redis broker
- **Database**: PostgreSQL 16 with pgvector (semantic search)
- **Frontend**: React + Vite + Tailwind CSS
- **Maps**: Leaflet (react-leaflet)
- **Charts**: Recharts
- **Satellite**: Microsoft Planetary Computer STAC API (free, no auth needed)
- **Weather**: Open-Meteo Archive API (free, no key)
- **Literature scraping**: Biopython Entrez (PubMed)
- **PDF parsing**: PyMuPDF (text) + tabula-py (tables) + Ollama LLM fallback
- **LLM**: Ollama REST API (embedding: nomic-embed-text 768d, generation: qwen2.5)
- **OA PDF discovery**: Unpaywall API

## Decisions made during development

- **PostGIS deferred**: pgvector image doesn't include PostGIS. SatelliteData uses `bbox_wkt` (Text) instead of PostGIS Geometry. Custom Dockerfile ready at `docker/Dockerfile.db`.
- **Embedding dimension**: 768 (nomic-embed-text) instead of 1536 (Qwen2.5) — purpose-built for embeddings.
- **Satellite source**: Planetary Computer STAC over GEE — no service account, free, COG tiles.
- **Semantic search fallback**: `/publications/search?mode=auto|text|semantic`. Falls back to ilike when Ollama unavailable.

## Database schema

Six tables in PostgreSQL:

1. **publications** — pgvector Vector(768) embeddings for semantic search
2. **chemical_analyses** — normalized: one row per element per sample
3. **satellite_data** — Sentinel-2 scene metadata with bbox_wkt
4. **hydro_monitoring** — time series: rainfall, temperature, humidity
5. **lab_samples** — batch tracking with status workflow
6. **archaeological_sites** — coordinates, evidence status, GeoJSON

All tables have: id (UUID), created_at, updated_at, source, notes.

## API endpoints (actual)

### Data
- `GET /api/v1/publications` — paginated, filterable by year/journal
- `GET /api/v1/publications/search?q=&mode=auto` — text or semantic search
- `GET /api/v1/publications/{id}`
- `GET /api/v1/chemistry/elements` — distinct elements with stats
- `GET /api/v1/chemistry/by-element/{symbol}`
- `GET /api/v1/chemistry/compare?elements=Ca,Mg,Na`
- `GET /api/v1/hydro/rainfall?resolution=monthly&start=&end=`
- `GET /api/v1/hydro/stats` — annual totals, monthly avgs, temp
- `GET /api/v1/satellite/scenes`
- `GET /api/v1/satellite/stats`
- `GET /api/v1/archaeology/sites` — GeoJSON FeatureCollection
- `GET /api/v1/archaeology/sites/{id}`
- `GET /api/v1/lab/samples`
- `POST /api/v1/lab/samples`
- `POST /api/v1/lab/samples/{id}/results` — CSV upload
- `GET /api/v1/lab/samples/{id}/report`

### Task triggers
- `POST /api/v1/tasks/ingest-papers`
- `POST /api/v1/tasks/fetch-satellite`
- `POST /api/v1/tasks/parse-pdfs`
- `POST /api/v1/tasks/generate-embeddings`
- `POST /api/v1/tasks/sync-hydro`

## Celery tasks

| Task | Schedule | Description |
|------|----------|-------------|
| `ingest_papers` | Weekly Mon 03:00 UTC | PubMed scrape |
| `sync_hydro` | Daily 06:00 UTC | Open-Meteo weather data |

## Known issues

- **PostGIS not active**: bbox_wkt text field instead of geometry column
- **Tabula parsing fragile**: Java errors on some PDFs; PyMuPDF text fallback
- **Only 3 PDFs downloaded**: Unpaywall rate limiting, most papers behind paywalls
- **LLM extraction untested**: Requires running Ollama + qwen2.5
- **LabSample model hack**: Uses `element` field for status — needs proper `status` column

## Build & run

```bash
make setup      # docker + deps + migrate + seed
make api        # FastAPI at :8000
make dashboard  # Vite at :5173
make worker     # Celery worker
make test       # test all endpoints
```

## Reference data

Zamzam (Bhardwaj 2023, Donia 2021):
- Ca: 93, Mg: 42, Na: 210 mg/L | F: 0.74, Li: 0.012 mg/L
- As: 0.006, Pb: 0.0005, Cd: 0.001 µg/L | pH: 7.95 | TDS: 813 mg/L

Well (Springer 2017): depth 31m, recovery 11min, extraction 500k m³/yr, peak 2M L/day

## Code style

- Python: black, isort, type hints | SQL: alembic only
- React: functional components, hooks | Commits: conventional

## Important notes

- RESEARCH project. Notebooks are first-class citizens.
- All data cited with DOI, year, method, location.
- Reproducible: clone → make setup → analyze.
- Large files in data/ (gitignored) with download scripts.
