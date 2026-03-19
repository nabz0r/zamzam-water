from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.config import settings
from api.routers import archaeology, chemistry, publications, satellite

app = FastAPI(
    title="Zamzam Research API",
    description="Independent scientific research platform for Zamzam water analysis",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(publications.router)
app.include_router(chemistry.router)
app.include_router(archaeology.router)
app.include_router(satellite.router)


@app.get("/")
async def root():
    return {
        "project": "zamzam-research",
        "version": "0.2.0",
        "status": "running",
    }


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/api/v1/tasks/ingest-papers")
async def trigger_ingest_papers():
    """Manually trigger the PubMed paper ingestion."""
    from api.services.pubmed_scraper import run_scraper
    stats = run_scraper()
    return {"status": "completed", **stats}


@app.post("/api/v1/tasks/fetch-satellite")
async def trigger_fetch_satellite():
    """Search and store Sentinel-2 scene metadata."""
    from api.services.satellite_fetcher import run_satellite_search
    stats = run_satellite_search()
    return {"status": "completed", **stats}


@app.post("/api/v1/tasks/parse-pdfs")
async def trigger_parse_pdfs():
    """Download open-access PDFs and extract chemical data."""
    from api.services.pdf_parser import run_pdf_parser
    stats = run_pdf_parser()
    return {"status": "completed", **stats}


@app.post("/api/v1/tasks/generate-embeddings")
async def trigger_generate_embeddings():
    """Generate pgvector embeddings for publications via Ollama."""
    from api.services.embeddings import generate_embeddings_batch
    stats = generate_embeddings_batch()
    return {"status": "completed", **stats}
