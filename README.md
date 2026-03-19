# 🔬 zamzam-research

> Independent scientific research platform for hydrochemical analysis of Zamzam water and archaeological verification of Quranic historical sites.

## 🎯 Research objectives

### Primary: Zamzam water hydrochemical analysis
- **Meta-analysis** of all published peer-reviewed literature on Zamzam water composition
- **Independent lab analysis** of Zamzam water samples (ICP-MS, isotopic dating, microbiome sequencing)
- **Hydrogeological modeling** of the Wadi Ibrahim aquifer system using satellite data and public geological records
- **Comparative study** against international drinking water standards and therapeutic mineral waters
- **Temporal analysis** of composition stability across published studies (1976–present)

### Secondary: Quranic archaeological sites database
- Comprehensive georeferenced catalog of all cities/sites mentioned in the Quran
- Archaeological evidence status tracking (confirmed, partially confirmed, under investigation, unlocated)
- Satellite imagery analysis for potential undiscovered sites (GPR, Landsat, Sentinel-2)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                 DATA INGESTION LAYER                │
│  PubMed/Entrez │ Sentinel/GEE │ SGS/ZSRC │ Lab CSV │
└────────────────────────┬────────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │  FastAPI + Celery   │◄── Redis (queue)
              │  Workers & Scheduler│
              └──────────┬──────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│            PostgreSQL + pgvector + PostGIS           │
│  publications │ chemical_analyses │ satellite_data   │
│  hydro_monitoring │ lab_samples │ archaeological_sites│
└────────────────────────┬────────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │   Analysis Engine   │
              │  Jupyter + Ollama   │
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │   React Dashboard   │
              │ Map │ Chem │ Papers │
              └─────────────────────┘
```

## 📁 Project structure

```
zamzam-research/
├── README.md
├── LICENSE                    # MIT
├── docker-compose.yml         # PostgreSQL + Redis + API + Worker
├── .env.example
│
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py            # FastAPI app
│   │   ├── config.py          # Settings (pydantic-settings)
│   │   ├── database.py        # SQLAlchemy + async engine
│   │   │
│   │   ├── models/            # SQLAlchemy ORM models
│   │   │   ├── publication.py
│   │   │   ├── chemical_analysis.py
│   │   │   ├── satellite_data.py
│   │   │   ├── hydro_monitoring.py
│   │   │   ├── lab_sample.py
│   │   │   └── archaeological_site.py
│   │   │
│   │   ├── schemas/           # Pydantic schemas
│   │   │   └── ...
│   │   │
│   │   ├── api/               # API routes
│   │   │   ├── publications.py
│   │   │   ├── chemistry.py
│   │   │   ├── satellite.py
│   │   │   ├── hydro.py
│   │   │   ├── lab.py
│   │   │   └── archaeology.py
│   │   │
│   │   └── services/          # Business logic
│   │       ├── pubmed_scraper.py
│   │       ├── gee_pipeline.py
│   │       ├── sgs_scraper.py
│   │       └── lab_parser.py
│   │
│   ├── workers/               # Celery tasks
│   │   ├── __init__.py
│   │   ├── celery_app.py
│   │   └── tasks.py
│   │
│   ├── alembic/               # DB migrations
│   │   ├── alembic.ini
│   │   └── versions/
│   │
│   ├── notebooks/             # Jupyter analysis notebooks
│   │   ├── 01_literature_review.ipynb
│   │   ├── 02_chemical_comparison.ipynb
│   │   ├── 03_satellite_analysis.ipynb
│   │   └── 04_hydro_model.ipynb
│   │
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── MapViewer.jsx       # Leaflet/MapLibre
│   │   │   ├── ChemExplorer.jsx    # Recharts comparisons
│   │   │   ├── PaperSearch.jsx     # Semantic search UI
│   │   │   ├── LabTracker.jsx      # Sample management
│   │   │   └── SitesCatalog.jsx    # Archaeological sites
│   │   └── utils/
│   ├── package.json
│   └── Dockerfile
│
├── data/
│   ├── raw/                   # Raw downloaded data (gitignored)
│   ├── processed/             # Cleaned datasets
│   ├── references/            # Key papers PDFs (gitignored)
│   └── seeds/
│       ├── known_analyses.json       # Published Zamzam compositions
│       ├── archaeological_sites.json # Quranic sites catalog
│       └── water_standards.json      # WHO/EPA limits
│
└── docs/
    ├── METHODOLOGY.md
    ├── SAMPLING_PROTOCOL.md
    └── RESEARCH_QUESTIONS.md
```

## 🔬 Key research questions

### Zamzam hydrochemistry
1. **Age**: What is the radiometric age of Zamzam water? (¹⁴C of DIC, tritium, δ¹⁸O/δ²H)
2. **Sterility**: Why does Zamzam show no biological growth? (16S rRNA sequencing, antimicrobial mineral profile)
3. **Recharge**: How does the Wadi Ibrahim aquifer sustain output in an arid environment? (water balance modeling)
4. **Stability**: Has the chemical composition remained stable across 50 years of published analyses?
5. **Therapeutics**: Do the mineral ratios (Ca/Mg, Li concentration, alkaline pH) explain reported health effects?
6. **Urbanization impact**: Is Mecca's rapid development threatening aquifer recharge?

### Archaeological verification
1. Complete georeferenced catalog of all Quranic sites with evidence status
2. Satellite-based prospection for unlocated sites (Iram exact location, Al-Ahqaf)
3. Cross-referencing Quranic descriptions with archaeological findings

## 🛠️ Tech stack

| Component | Technology |
|-----------|-----------|
| API | FastAPI + Pydantic v2 |
| Task queue | Celery + Redis |
| Database | PostgreSQL 16 + pgvector + PostGIS |
| ORM | SQLAlchemy 2.0 (async) |
| Migrations | Alembic |
| Scraping | Scrapy + httpx + BeautifulSoup |
| Satellite | Google Earth Engine Python API |
| ML/Embeddings | Ollama (Qwen2.5) |
| Frontend | React 18 + Vite + TailwindCSS |
| Maps | MapLibre GL JS |
| Charts | Recharts |
| Notebooks | Jupyter Lab |
| Container | Docker + docker-compose |

## 🌱 Seed data sources

### Published Zamzam analyses
- Donia & Mortada (2021) — Heliyon — ICP-OES, 6 tap + 1 bottled samples
- Bhardwaj (2023) — BJSTR — ICP-MS, 52 elements, 10 samples from Masjid Al-Haram
- Shomar (2012) — J Environ Sci Health — comprehensive hydrochemical study
- Al-Gamal (2009) — isotopic analysis, Holocene recharge hypothesis
- American Water Resource Association (1976) — first international analysis

### Satellite data (free)
- Sentinel-2 (10m resolution, multispectral) via Copernicus Open Access Hub
- Landsat 8/9 (30m, thermal) via USGS Earth Explorer
- SRTM DEM (30m elevation) for watershed delineation
- Open-Meteo API for historical rainfall data

### Archaeological references
- Ebla tablets (1975, University of Rome)
- Ubar/Shisr excavations (1990s, Nicholas Clapp / JPL)
- Tall el-Hammam excavations (Dead Sea, Sodom candidate)
- Madain Salih / Al-Hijr (UNESCO, Thamud)
- Marib Dam (Yemen, Saba)

## 📋 Roadmap

### Phase 1 — Foundation (current)
- [x] Repository setup
- [ ] Docker environment (PostgreSQL + Redis)
- [ ] Database schema + Alembic migrations
- [ ] PubMed scraper (first data source)
- [ ] Seed data: published chemical analyses
- [ ] Basic React dashboard shell

### Phase 2 — Data collection
- [ ] Satellite pipeline (GEE → PostGIS)
- [ ] SGS/ZSRC data scraper
- [ ] Lab sample upload & parsing
- [ ] Archaeological sites catalog with coordinates
- [ ] Semantic search over publications (pgvector + Ollama)

### Phase 3 — Analysis
- [ ] Chemical composition comparison notebooks
- [ ] Hydrogeological model (MODFLOW or analytical)
- [ ] Temporal stability analysis across published studies
- [ ] Satellite-based watershed delineation
- [ ] Interactive map of Quranic archaeological sites

### Phase 4 — Independent analysis
- [ ] Order Zamzam samples → send to European lab
- [ ] ICP-MS elemental analysis
- [ ] Isotopic dating (δ¹⁸O, δ²H, ¹⁴C)
- [ ] 16S rRNA microbiome sequencing
- [ ] Publication: preprint on arXiv → journal submission

## 🚀 Quick start

```bash
git clone https://github.com/nabz0r/zamzam-research.git
cd zamzam-research
cp .env.example .env
docker-compose up -d
# API at http://localhost:8000
# Frontend at http://localhost:5173
# Jupyter at http://localhost:8888
```

## 📄 License

MIT — Open science, open source.

## 🤝 Contributing

This is an independent research project. Contributions welcome from scientists, engineers, and anyone interested in rigorous investigation at the intersection of science and heritage.

---

*"Afala yandhuruna" — "Do they not look?" (Quran 88:17)*
