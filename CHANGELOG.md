# Changelog

All notable changes to this project are documented here.

## [0.3.0] — 2026-03-19

### Added
- 7 new water sources: Perrier, Gerolsteiner, Fiji, Acqua Panna, Highland Spring, Spa Reine, Luxembourg tap (SEBES)
- Research page (`ResearchView.jsx`) — key findings, WHO compliance table, research gaps, draft paper reference
- Radar chart (Recharts) in ChemExplorer — normalized mineral fingerprint, toggle sources on/off
- Interactive heatmap in ChemExplorer — concentration matrix (elements x sources)
- Dataset export script (`scripts/export_dataset.py`) generating CSV, JSON summary, and dataset README
- `exports/` directory with `zamzam_chemical_dataset.csv` (177 rows), `zamzam_meta_analysis_summary.json`, `README_dataset.md`
- `make export` Makefile target

### Changed
- Water sources expanded from 9 to 16 (5 Zamzam studies + 11 comparison waters)
- ChemExplorer source selector updated with 12 color-coded water brands
- Sidebar navigation: added Research page between Archaeology and Lab

## [0.2.0] — 2026-03-18

### Added
- Paper relevance classification (`scripts/classify_papers.py`, `make classify`)
- 9-source chemistry comparison (5 Zamzam + Evian, Vittel, Volvic, San Pellegrino)
- ChemExplorer with grouped bar charts, WHO compliance table, source selector
- Admin panel (`AdminPanel.jsx`) with table stats and data action triggers
- `manual_compositions.json` reference dataset
- Seed script for chemical analyses from published studies

### Changed
- Publications filterable by `relevant_only=true` (51 of 115 relevant)
- Dashboard sidebar with stats footer

## [0.1.0] — 2026-03-17

### Added
- FastAPI backend with SQLAlchemy 2.0 async, Alembic migrations, pgvector
- 6 database models: publications, chemical_analyses, satellite_data, hydro_monitoring, lab_samples, archaeological_sites
- PubMed scraper (Biopython Entrez) — 115 publications ingested
- Sentinel-2 satellite fetcher (Planetary Computer STAC)
- Open-Meteo weather data sync — 7,905 daily records (2019–2026)
- PDF parser (PyMuPDF + tabula-py + Ollama LLM fallback)
- Embedding service (Ollama nomic-embed-text → pgvector)
- Celery task queue with Redis broker and beat scheduler
- React dashboard with Vite + Tailwind CSS
- Dashboard pages: Home, PaperSearch, ChemExplorer, HydroView, SatelliteViewer, ArchaeoMap, LabTracker
- 12 archaeological sites with GeoJSON support
- Docker Compose setup (PostgreSQL + Redis + Ollama)
- Makefile with setup, api, dashboard, worker, test targets
- Jupyter notebooks for literature review, chemical meta-analysis, satellite analysis
