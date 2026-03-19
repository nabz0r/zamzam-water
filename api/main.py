from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.config import settings
from api.routers import archaeology, chemistry, publications

app = FastAPI(
    title="Zamzam Research API",
    description="Independent scientific research platform for Zamzam water analysis",
    version="0.1.0",
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


@app.get("/")
async def root():
    return {
        "project": "zamzam-research",
        "version": "0.1.0",
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
