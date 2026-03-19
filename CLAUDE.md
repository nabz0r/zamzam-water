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
- **Database**: PostgreSQL 16 with pgvector (semantic search) + PostGIS (geospatial)
- **Frontend**: React + Vite + Tailwind CSS
- **Maps**: Leaflet or MapLibre GL JS
- **Charts**: Recharts
- **Satellite**: Google Earth Engine Python API (ee)
- **Literature scraping**: Biopython Entrez (PubMed) + requests for Springer/ScienceDirect
- **PDF parsing**: Tabula (tables), PyMuPDF (text extraction)
- **LLM**: Ollama REST API (local, model: qwen2.5)

## Database schema overview

Six main tables in PostgreSQL:

1. **publications** — scraped papers with pgvector embeddings for semantic search
2. **chemical_analyses** — normalized element concentrations from all sources
3. **satellite_data** — GeoTIFF metadata + PostGIS geometries for Wadi Ibrahim
4. **hydro_monitoring** — time series: water level, rainfall, flow rates
5. **lab_samples** — our own independent lab results with batch/protocol tracking
6. **archaeological_sites** — Quranic sites with coordinates, evidence, refs

All tables have: id (UUID), created_at, updated_at, source, notes.
chemical_analyses uses a normalized structure: one row per element per sample.

## Key coordinates

- **Zamzam Well**: 21.4225°N, 39.8262°E
- **Wadi Ibrahim basin**: bbox roughly 21.38-21.46°N, 39.80-39.90°E
- **Kaaba**: 21.4225°N, 39.8262°E

## API design

REST endpoints following this pattern:
- `GET /api/v1/publications` — list/search papers
- `GET /api/v1/publications/search?q=arsenic` — semantic search via pgvector
- `GET /api/v1/chemistry/elements` — all element analyses
- `GET /api/v1/chemistry/compare?element=Ca&sources=zamzam,evian,vittel`
- `GET /api/v1/satellite/tiles/{z}/{x}/{y}` — map tiles
- `GET /api/v1/hydro/timeseries?metric=water_level`
- `GET /api/v1/lab/samples` — our lab results
- `GET /api/v1/archaeology/sites` — all sites with geojson
- `POST /api/v1/lab/upload` — upload lab CSV/PDF results
- `POST /api/v1/tasks/ingest-papers` — trigger paper scraping task
- `POST /api/v1/tasks/fetch-satellite` — trigger satellite data fetch

## Celery tasks

- `ingest_papers` — weekly PubMed scrape, PDF download, embedding generation
- `fetch_satellite` — monthly Sentinel-2/Landsat composite fetch
- `sync_hydro` — daily rainfall/weather data sync (Open-Meteo API)
- `generate_embeddings` — batch embedding generation for new papers

## Code style

- Python: black formatter, isort, type hints everywhere
- SQL: alembic for all migrations, never raw DDL
- React: functional components, hooks, no class components
- Naming: snake_case Python, camelCase JS/React
- Commits: conventional commits (feat:, fix:, docs:, data:)

## Build order (priority)

When starting fresh, build in this order:

1. `docker-compose.yml` — PostgreSQL (pgvector+PostGIS) + Redis
2. `.env.example` + `api/config.py` — configuration
3. `api/models/` — all SQLAlchemy models
4. Alembic init + first migration
5. `scripts/seed_known_data.py` — seed published Zamzam compositions
6. `api/services/pubmed_scraper.py` — first scraper (quick wins)
7. `api/routers/publications.py` + `api/routers/chemistry.py` — first endpoints
8. `api/main.py` — FastAPI app assembly
9. `dashboard/` — React app with basic views
10. Satellite pipeline (GEE setup needed)

## Reference data to seed

Published Zamzam chemical compositions (from Bhardwaj 2023, Donia 2021):
- Ca: 93 mg/L, Mg: 42 mg/L, Na: 210 mg/L
- F: 0.74 mg/L, Li: 0.012 mg/L
- As: 0.006 µg/L, Pb: <0.0005 µg/L, Cd: <0.001 µg/L
- pH: 7.9-8.0, TDS: 812-814 mg/L

Well characteristics (from Springer 2017):
- Depth: ~31m (14m alluvium + 0.5m weathered rock + 17m diorite bedrock)
- Recovery time: 11 minutes after 24h pumping at 8000 L/s
- Annual extraction limit: ~500,000 m³
- Peak demand: 2,000,000 L/day (Hajj season)

## Important notes

- This is a RESEARCH project, not a product. Code quality matters but shipping
  analysis results matters more. Notebooks are first-class citizens.
- All data sources must be cited. Every chemical value needs: source paper DOI,
  year, analytical method, sample location.
- The project must be reproducible. Anyone should be able to clone the repo,
  run docker compose up, seed the data, and start analyzing.
- Satellite data files are large — keep them in data/ (gitignored) with
  download scripts that can reproduce the dataset.
