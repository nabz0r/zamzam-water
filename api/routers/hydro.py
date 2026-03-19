from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, extract
from sqlalchemy.ext.asyncio import AsyncSession

from api.database import get_db
from api.models.hydro_monitoring import HydroMonitoring


def _parse_date(s: str, end_of_day: bool = False) -> datetime:
    """Parse flexible date string (YYYY-MM or YYYY-MM-DD) to datetime."""
    s = s.strip()
    if len(s) == 7:  # YYYY-MM
        s += "-01" if not end_of_day else "-28"
    if end_of_day and len(s) == 10:
        return datetime.fromisoformat(s + "T23:59:59")
    return datetime.fromisoformat(s)

router = APIRouter(prefix="/api/v1/hydro", tags=["hydro"])


@router.get("/rainfall")
async def get_rainfall(
    start: Optional[str] = Query(None, description="Start date YYYY-MM or YYYY-MM-DD"),
    end: Optional[str] = Query(None, description="End date YYYY-MM or YYYY-MM-DD"),
    resolution: str = Query("daily", pattern="^(daily|monthly)$"),
    db: AsyncSession = Depends(get_db),
):
    """Get rainfall data with optional date range and resolution."""
    query = select(HydroMonitoring).where(HydroMonitoring.metric == "rainfall")

    if start:
        query = query.where(HydroMonitoring.measured_at >= _parse_date(start))
    if end:
        query = query.where(HydroMonitoring.measured_at <= _parse_date(end, end_of_day=True))

    query = query.order_by(HydroMonitoring.measured_at)
    result = await db.execute(query)
    rows = result.scalars().all()

    if resolution == "monthly" and rows:
        # Aggregate to monthly totals
        monthly = {}
        for r in rows:
            key = r.measured_at.strftime("%Y-%m")
            if key not in monthly:
                monthly[key] = {"month": key, "total_mm": 0, "days": 0}
            monthly[key]["total_mm"] += r.value
            monthly[key]["days"] += 1
        return {"resolution": "monthly", "data": list(monthly.values())}

    return {
        "resolution": "daily",
        "total": len(rows),
        "data": [
            {
                "date": r.measured_at.strftime("%Y-%m-%d"),
                "value": r.value,
                "unit": r.unit,
            }
            for r in rows
        ],
    }


@router.get("/stats")
async def hydro_stats(db: AsyncSession = Depends(get_db)):
    """Summary statistics: annual totals, monthly averages."""
    # Total days of data
    count_result = await db.execute(
        select(func.count()).select_from(HydroMonitoring).where(
            HydroMonitoring.metric == "rainfall"
        )
    )
    total_days = count_result.scalar()

    # Annual rainfall totals
    annual_query = (
        select(
            extract("year", HydroMonitoring.measured_at).label("year"),
            func.sum(HydroMonitoring.value).label("total_mm"),
            func.count().label("days"),
        )
        .where(HydroMonitoring.metric == "rainfall")
        .group_by(extract("year", HydroMonitoring.measured_at))
        .order_by(extract("year", HydroMonitoring.measured_at))
    )
    annual_result = await db.execute(annual_query)
    annual = [
        {"year": int(r.year), "total_mm": round(r.total_mm, 1), "days": r.days}
        for r in annual_result
    ]

    # Monthly averages across all years
    monthly_query = (
        select(
            extract("month", HydroMonitoring.measured_at).label("month"),
            func.avg(HydroMonitoring.value).label("avg_mm"),
            func.max(HydroMonitoring.value).label("max_mm"),
        )
        .where(HydroMonitoring.metric == "rainfall")
        .group_by(extract("month", HydroMonitoring.measured_at))
        .order_by(extract("month", HydroMonitoring.measured_at))
    )
    monthly_result = await db.execute(monthly_query)
    monthly = [
        {"month": int(r.month), "avg_daily_mm": round(r.avg_mm, 2), "max_daily_mm": r.max_mm}
        for r in monthly_result
    ]

    # Temperature stats
    temp_result = await db.execute(
        select(
            func.avg(HydroMonitoring.value).label("avg"),
            func.min(HydroMonitoring.value).label("min"),
            func.max(HydroMonitoring.value).label("max"),
        ).where(HydroMonitoring.metric == "temperature")
    )
    temp = temp_result.one()

    return {
        "total_days": total_days,
        "annual_rainfall": annual,
        "monthly_rainfall_avg": monthly,
        "temperature": {
            "avg": round(temp.avg, 1) if temp.avg else None,
            "min": temp.min,
            "max": temp.max,
        },
    }
