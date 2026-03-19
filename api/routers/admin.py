from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.database import get_db
from api.models import (
    Publication,
    ChemicalAnalysis,
    SatelliteData,
    HydroMonitoring,
    LabSample,
    ArchaeologicalSite,
)

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


@router.get("/stats")
async def admin_stats(db: AsyncSession = Depends(get_db)):
    """Database table counts and last ingestion timestamps."""
    tables = [
        ("publications", Publication),
        ("chemical_analyses", ChemicalAnalysis),
        ("satellite_data", SatelliteData),
        ("hydro_monitoring", HydroMonitoring),
        ("lab_samples", LabSample),
        ("archaeological_sites", ArchaeologicalSite),
    ]

    counts = {}
    last_updated = {}

    for name, model in tables:
        count_q = select(func.count()).select_from(model)
        counts[name] = (await db.execute(count_q)).scalar() or 0

        latest_q = select(func.max(model.created_at))
        last = (await db.execute(latest_q)).scalar()
        last_updated[name] = last.isoformat() if last else None

    return {
        "counts": counts,
        "last_updated": last_updated,
    }


@router.post("/seed")
async def trigger_seed():
    """Re-seed database with reference chemistry data and archaeological sites."""
    import subprocess
    result = subprocess.run(
        ["python3", "scripts/seed_known_data.py"],
        capture_output=True, text=True, env={"PYTHONPATH": ".", "PATH": "/usr/bin:/usr/local/bin"},
        timeout=30,
    )
    return {
        "status": "completed" if result.returncode == 0 else "error",
        "output": result.stdout.strip(),
        "error": result.stderr.strip() if result.returncode != 0 else None,
    }


@router.post("/classify")
async def trigger_classify():
    """Classify publications as relevant/not relevant to Zamzam research."""
    import subprocess
    result = subprocess.run(
        ["python3", "scripts/classify_papers.py"],
        capture_output=True, text=True, env={"PYTHONPATH": ".", "PATH": "/usr/bin:/usr/local/bin"},
        timeout=30,
    )
    return {
        "status": "completed" if result.returncode == 0 else "error",
        "output": result.stdout.strip(),
        "error": result.stderr.strip() if result.returncode != 0 else None,
    }
