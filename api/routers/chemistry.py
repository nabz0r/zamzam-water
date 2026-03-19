from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.database import get_db
from api.models.chemical_analysis import ChemicalAnalysis

router = APIRouter(prefix="/api/v1/chemistry", tags=["chemistry"])


@router.get("/sources")
async def list_sources(db: AsyncSession = Depends(get_db)):
    """List all distinct sample sources with measurement counts."""
    query = (
        select(
            ChemicalAnalysis.sample_source,
            func.count().label("count"),
        )
        .group_by(ChemicalAnalysis.sample_source)
        .order_by(ChemicalAnalysis.sample_source)
    )
    result = await db.execute(query)
    rows = result.all()
    return {
        "sources": [{"source": r.sample_source, "count": r.count} for r in rows],
    }


@router.get("/elements")
async def list_elements(db: AsyncSession = Depends(get_db)):
    """List all distinct elements in the database with measurement counts."""
    query = (
        select(
            ChemicalAnalysis.element,
            ChemicalAnalysis.unit,
            func.count().label("count"),
            func.avg(ChemicalAnalysis.value).label("avg_value"),
            func.min(ChemicalAnalysis.value).label("min_value"),
            func.max(ChemicalAnalysis.value).label("max_value"),
        )
        .group_by(ChemicalAnalysis.element, ChemicalAnalysis.unit)
        .order_by(ChemicalAnalysis.element)
    )
    result = await db.execute(query)
    rows = result.all()

    return {
        "total": len(rows),
        "elements": [
            {
                "element": r.element,
                "unit": r.unit,
                "count": r.count,
                "avg_value": round(r.avg_value, 6) if r.avg_value else None,
                "min_value": r.min_value,
                "max_value": r.max_value,
            }
            for r in rows
        ],
    }


@router.get("/by-element/{symbol}")
async def get_by_element(
    symbol: str,
    source: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Get all measurements for a given element, with source and year."""
    query = select(ChemicalAnalysis).where(ChemicalAnalysis.element == symbol)
    if source:
        query = query.where(ChemicalAnalysis.sample_source.ilike(f"%{source}%"))
    query = query.order_by(ChemicalAnalysis.publication_year.desc().nullslast())

    result = await db.execute(query)
    analyses = result.scalars().all()

    return {
        "element": symbol,
        "total": len(analyses),
        "measurements": [
            {
                "id": str(a.id),
                "value": a.value,
                "unit": a.unit,
                "sample_source": a.sample_source,
                "analytical_method": a.analytical_method,
                "sample_location": a.sample_location,
                "publication_doi": a.publication_doi,
                "publication_year": a.publication_year,
                "source": a.source,
                "notes": a.notes,
            }
            for a in analyses
        ],
    }


@router.get("/compare")
async def compare_elements(
    elements: str = Query(..., description="Comma-separated element symbols, e.g. Ca,Mg,Na"),
    sources: Optional[str] = Query(None, description="Comma-separated sources to filter, e.g. zamzam,evian"),
    db: AsyncSession = Depends(get_db),
):
    """Compare multiple elements — formatted for Recharts consumption.

    Returns data grouped by source/year, with one key per element.
    Optionally filter by sample_source.
    """
    element_list = [e.strip() for e in elements.split(",") if e.strip()]

    query = (
        select(ChemicalAnalysis)
        .where(ChemicalAnalysis.element.in_(element_list))
        .order_by(ChemicalAnalysis.publication_year, ChemicalAnalysis.sample_source)
    )
    if sources:
        source_list = [s.strip() for s in sources.split(",") if s.strip()]
        query = query.where(ChemicalAnalysis.sample_source.in_(source_list))
    result = await db.execute(query)
    analyses = result.scalars().all()

    # Group by (sample_source, publication_year) for Recharts
    grouped: dict[tuple, dict] = {}
    for a in analyses:
        key = (a.sample_source or "unknown", a.publication_year)
        if key not in grouped:
            grouped[key] = {
                "source": a.sample_source or "unknown",
                "year": a.publication_year,
            }
        grouped[key][a.element] = a.value

    chart_data = list(grouped.values())

    return {
        "elements": element_list,
        "data": chart_data,
    }
