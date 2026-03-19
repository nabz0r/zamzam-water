"""Weather/hydro data fetcher using Open-Meteo Archive API.

Fetches historical precipitation, temperature, and humidity for Mecca
to analyze aquifer recharge patterns in the Wadi Ibrahim basin.
"""

import uuid
from datetime import datetime, date
from typing import Optional

import httpx
from sqlalchemy import create_engine, select, func
from sqlalchemy.orm import Session

from api.config import settings
from api.models.hydro_monitoring import HydroMonitoring

# Mecca coordinates (near Zamzam well)
MECCA_LAT = 21.4225
MECCA_LON = 39.8262

ARCHIVE_API = "https://archive-api.open-meteo.com/v1/archive"

METRICS = {
    "precipitation_sum": ("rainfall", "mm"),
    "temperature_2m_mean": ("temperature", "°C"),
    "relative_humidity_2m_mean": ("humidity", "%"),
}


def fetch_weather_data(
    start_date: str = "2019-01-01",
    end_date: str | None = None,
) -> list[dict]:
    """Fetch daily weather data from Open-Meteo Archive API.

    Returns list of dicts with metric, value, unit, date.
    """
    if end_date is None:
        end_date = date.today().isoformat()

    params = {
        "latitude": MECCA_LAT,
        "longitude": MECCA_LON,
        "start_date": start_date,
        "end_date": end_date,
        "daily": ",".join(METRICS.keys()),
        "timezone": "Asia/Riyadh",
    }

    resp = httpx.get(ARCHIVE_API, params=params, timeout=30.0)
    resp.raise_for_status()
    data = resp.json()

    daily = data.get("daily", {})
    dates = daily.get("time", [])

    records = []
    for metric_key, (metric_name, unit) in METRICS.items():
        values = daily.get(metric_key, [])
        for i, dt_str in enumerate(dates):
            val = values[i] if i < len(values) else None
            if val is not None:
                records.append({
                    "metric": metric_name,
                    "value": val,
                    "unit": unit,
                    "measured_at": datetime.fromisoformat(dt_str),
                })

    return records


def store_weather_data(records: list[dict], session: Optional[Session] = None) -> int:
    """Store weather records in hydro_monitoring, skipping existing dates."""
    own_session = False
    if session is None:
        engine = create_engine(settings.database_url_sync)
        session = Session(engine)
        own_session = True

    try:
        # Find the latest date already stored per metric
        latest = {}
        for metric_name in ["rainfall", "temperature", "humidity"]:
            result = session.execute(
                select(func.max(HydroMonitoring.measured_at)).where(
                    HydroMonitoring.metric == metric_name,
                    HydroMonitoring.source == "open_meteo",
                )
            )
            latest[metric_name] = result.scalar()

        count = 0
        for rec in records:
            # Skip if already stored
            cutoff = latest.get(rec["metric"])
            if cutoff and rec["measured_at"] <= cutoff:
                continue

            entry = HydroMonitoring(
                id=uuid.uuid4(),
                metric=rec["metric"],
                value=rec["value"],
                unit=rec["unit"],
                measured_at=rec["measured_at"],
                station="mecca_open_meteo",
                latitude=MECCA_LAT,
                longitude=MECCA_LON,
                source="open_meteo",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            session.add(entry)
            count += 1

        session.commit()
        return count

    finally:
        if own_session:
            session.close()


def run_weather_sync(start_date: str = "2019-01-01") -> dict:
    """Run the weather data sync pipeline."""
    records = fetch_weather_data(start_date=start_date)
    stored = store_weather_data(records)
    return {
        "records_fetched": len(records),
        "records_stored": stored,
    }
