"""Satellite data fetcher using Microsoft Planetary Computer STAC API.

Fetches Sentinel-2 L2A scenes for the Wadi Ibrahim basin and computes
vegetation/water/urbanization indices (NDVI, NDWI, NDBI).
"""

import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import httpx
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from api.config import settings
from api.models.satellite_data import SatelliteData

# Wadi Ibrahim bounding box [west, south, east, north]
WADI_IBRAHIM_BBOX = [39.80, 21.38, 39.90, 21.46]

STAC_API_URL = "https://planetarycomputer.microsoft.com/api/stac/v1"

# Sentinel-2 band names for index computation
S2_BANDS = {
    "B02": "blue",
    "B03": "green",
    "B04": "red",
    "B08": "nir",
    "B11": "swir",
    "B12": "swir2",
}


def search_sentinel2_scenes(
    bbox: list[float] = WADI_IBRAHIM_BBOX,
    months_back: int = 12,
    max_cloud_cover: float = 20.0,
    limit: int = 50,
) -> list[dict]:
    """Search Planetary Computer STAC for Sentinel-2 L2A scenes.

    Returns list of scene metadata dicts.
    """
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=months_back * 30)

    search_body = {
        "collections": ["sentinel-2-l2a"],
        "bbox": bbox,
        "datetime": f"{start_date.strftime('%Y-%m-%d')}/"
                    f"{end_date.strftime('%Y-%m-%d')}",
        "query": {
            "eo:cloud_cover": {"lt": max_cloud_cover},
        },
        "sortby": [{"field": "datetime", "direction": "desc"}],
        "limit": limit,
    }

    resp = httpx.post(
        f"{STAC_API_URL}/search",
        json=search_body,
        timeout=30.0,
    )
    resp.raise_for_status()
    data = resp.json()

    scenes = []
    for feature in data.get("features", []):
        props = feature.get("properties", {})
        geometry = feature.get("geometry", {})
        assets = feature.get("assets", {})

        # Extract band asset URLs
        band_urls = {}
        for band_key in S2_BANDS:
            asset = assets.get(band_key, {})
            if "href" in asset:
                band_urls[band_key] = asset["href"]

        # Build WKT from bbox
        bbox_scene = feature.get("bbox", bbox)
        w, s, e, n = bbox_scene
        bbox_wkt = (
            f"POLYGON(({w} {s}, {e} {s}, {e} {n}, {w} {n}, {w} {s}))"
        )

        scenes.append({
            "scene_id": feature.get("id", ""),
            "datetime": props.get("datetime", ""),
            "cloud_cover": props.get("eo:cloud_cover", 0),
            "resolution_m": 10,
            "bbox": bbox_scene,
            "bbox_wkt": bbox_wkt,
            "geometry": geometry,
            "band_urls": band_urls,
            "thumbnail": assets.get("rendered_preview", {}).get("href", ""),
        })

    return scenes


def compute_indices(red: float, nir: float, green: float = 0,
                    swir: float = 0) -> dict:
    """Compute spectral indices from mean band values.

    NDVI = (NIR - Red) / (NIR + Red)       — vegetation
    NDWI = (Green - NIR) / (Green + NIR)   — water
    NDBI = (SWIR - NIR) / (SWIR + NIR)     — built-up/urbanization
    """
    eps = 1e-10
    ndvi = (nir - red) / (nir + red + eps)
    ndwi = (green - nir) / (green + nir + eps) if green else 0
    ndbi = (swir - nir) / (swir + nir + eps) if swir else 0
    return {"ndvi": round(ndvi, 4), "ndwi": round(ndwi, 4), "ndbi": round(ndbi, 4)}


def store_scenes(scenes: list[dict], session: Optional[Session] = None) -> int:
    """Store satellite scene metadata in the database.

    Returns number of new scenes stored.
    """
    own_session = False
    if session is None:
        engine = create_engine(settings.database_url_sync)
        session = Session(engine)
        own_session = True

    try:
        count = 0
        for scene in scenes:
            dt_str = scene["datetime"]
            if dt_str:
                acq_date = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
            else:
                continue

            sat = SatelliteData(
                id=uuid.uuid4(),
                satellite="sentinel-2-l2a",
                band="multispectral",
                acquisition_date=acq_date,
                cloud_cover=scene["cloud_cover"],
                resolution_m=scene["resolution_m"],
                bbox_wkt=scene["bbox_wkt"],
                source="planetary_computer",
                notes=f"scene_id={scene['scene_id']}",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            session.add(sat)
            count += 1

        session.commit()
        return count
    finally:
        if own_session:
            session.close()


def run_satellite_search() -> dict:
    """Run the satellite search pipeline and store results.

    Returns stats dict.
    """
    scenes = search_sentinel2_scenes()
    stored = store_scenes(scenes)
    return {
        "scenes_found": len(scenes),
        "scenes_stored": stored,
    }
