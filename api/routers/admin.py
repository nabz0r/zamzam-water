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
