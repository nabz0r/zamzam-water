import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.database import get_db
from api.models.archaeological_site import ArchaeologicalSite

router = APIRouter(prefix="/api/v1/archaeology", tags=["archaeology"])


@router.get("/sites")
async def list_sites(db: AsyncSession = Depends(get_db)):
    """Return all archaeological sites as a GeoJSON FeatureCollection."""
    result = await db.execute(
        select(ArchaeologicalSite).order_by(ArchaeologicalSite.name_en)
    )
    sites = result.scalars().all()

    features = []
    for s in sites:
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [s.longitude, s.latitude],
            }
            if s.latitude and s.longitude
            else None,
            "properties": {
                "id": str(s.id),
                "name_en": s.name_en,
                "name_ar": s.name_ar,
                "quranic_name": s.quranic_name,
                "surah_refs": s.surah_refs,
                "modern_location": s.modern_location,
                "country": s.country,
                "evidence_status": s.evidence_status,
                "description": s.description,
                "archaeological_refs": s.archaeological_refs,
            },
        }
        features.append(feature)

    return {
        "type": "FeatureCollection",
        "features": features,
    }


@router.get("/sites/{site_id}")
async def get_site(site_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Get a single archaeological site by ID."""
    result = await db.execute(
        select(ArchaeologicalSite).where(ArchaeologicalSite.id == site_id)
    )
    site = result.scalar_one_or_none()
    if site is None:
        raise HTTPException(status_code=404, detail="Site not found")

    return {
        "id": str(site.id),
        "name_en": site.name_en,
        "name_ar": site.name_ar,
        "quranic_name": site.quranic_name,
        "surah_refs": site.surah_refs,
        "latitude": site.latitude,
        "longitude": site.longitude,
        "modern_location": site.modern_location,
        "country": site.country,
        "evidence_status": site.evidence_status,
        "description": site.description,
        "archaeological_refs": site.archaeological_refs,
        "geojson": site.geojson,
        "source": site.source,
        "notes": site.notes,
        "created_at": site.created_at.isoformat() if site.created_at else None,
    }
