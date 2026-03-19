from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from api.database import get_db
from api.models.satellite_data import SatelliteData

router = APIRouter(prefix="/api/v1/satellite", tags=["satellite"])


@router.get("/scenes")
async def list_scenes(db: AsyncSession = Depends(get_db)):
    """List all satellite scenes with metadata."""
    result = await db.execute(
        select(SatelliteData).order_by(SatelliteData.acquisition_date.desc())
    )
    scenes = result.scalars().all()

    return {
        "total": len(scenes),
        "scenes": [
            {
                "id": str(s.id),
                "satellite": s.satellite,
                "band": s.band,
                "acquisition_date": s.acquisition_date.isoformat() if s.acquisition_date else None,
                "cloud_cover": s.cloud_cover,
                "resolution_m": s.resolution_m,
                "bbox_wkt": s.bbox_wkt,
                "source": s.source,
                "notes": s.notes,
            }
            for s in scenes
        ],
    }


@router.get("/stats")
async def satellite_stats(db: AsyncSession = Depends(get_db)):
    """Summary statistics for satellite data."""
    result = await db.execute(
        select(
            func.count().label("total_scenes"),
            func.min(SatelliteData.acquisition_date).label("earliest"),
            func.max(SatelliteData.acquisition_date).label("latest"),
            func.avg(SatelliteData.cloud_cover).label("avg_cloud"),
        )
    )
    row = result.one()
    return {
        "total_scenes": row.total_scenes,
        "earliest_date": row.earliest.isoformat() if row.earliest else None,
        "latest_date": row.latest.isoformat() if row.latest else None,
        "avg_cloud_cover": round(row.avg_cloud, 1) if row.avg_cloud else None,
    }
