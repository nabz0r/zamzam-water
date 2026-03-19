from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.database import get_db
from api.models.chemical_analysis import ChemicalAnalysis

router = APIRouter(prefix="/api/v1/chemistry", tags=["chemistry"])


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
    db: AsyncSession = Depends(get_db),
):
    """Compare multiple elements — formatted for Recharts consumption.

    Returns data grouped by source/year, with one key per element.
    """
    element_list = [e.strip() for e in elements.split(",") if e.strip()]

    query = (
        select(ChemicalAnalysis)
        .where(ChemicalAnalysis.element.in_(element_list))
        .order_by(ChemicalAnalysis.publication_year, ChemicalAnalysis.sample_source)
    )
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
