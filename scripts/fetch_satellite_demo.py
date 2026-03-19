"""Fetch one Sentinel-2 scene and print metadata + band info.

This demo script searches for the most recent cloud-free scene
over the Wadi Ibrahim basin and displays its properties.
For full GeoTIFF download, rasterio + planetary-computer token needed.
"""

import json
import sys

sys.path.insert(0, ".")

from api.services.satellite_fetcher import (
    WADI_IBRAHIM_BBOX,
    compute_indices,
    search_sentinel2_scenes,
    store_scenes,
)


def main():
    print("=" * 60)
    print("Zamzam Research — Satellite Demo")
    print(f"Target: Wadi Ibrahim basin {WADI_IBRAHIM_BBOX}")
    print("=" * 60)

    print("\nSearching Planetary Computer for Sentinel-2 L2A scenes...")
    scenes = search_sentinel2_scenes(months_back=12, max_cloud_cover=20, limit=10)

    if not scenes:
        print("No scenes found. Check network or try relaxing cloud cover filter.")
        return

    print(f"\nFound {len(scenes)} scenes:\n")
    for i, scene in enumerate(scenes):
        print(f"  [{i+1}] {scene['datetime'][:10]}  "
              f"cloud={scene['cloud_cover']:.1f}%  "
              f"id={scene['scene_id'][:40]}...")

    # Show details of the best (first) scene
    best = scenes[0]
    print(f"\n{'='*60}")
    print(f"Best scene: {best['scene_id']}")
    print(f"  Date:       {best['datetime'][:19]}")
    print(f"  Cloud:      {best['cloud_cover']:.1f}%")
    print(f"  Resolution: {best['resolution_m']}m")
    print(f"  BBOX:       {best['bbox']}")
    print(f"  WKT:        {best['bbox_wkt'][:80]}...")

    if best.get("band_urls"):
        print(f"\n  Available bands:")
        for band, url in best["band_urls"].items():
            print(f"    {band}: {url[:80]}...")

    if best.get("thumbnail"):
        print(f"\n  Thumbnail: {best['thumbnail'][:100]}...")

    # Demo index computation with sample values
    print(f"\n{'='*60}")
    print("Demo spectral indices (sample band values for Wadi Ibrahim):")
    sample_indices = compute_indices(red=0.12, nir=0.25, green=0.08, swir=0.18)
    print(f"  NDVI: {sample_indices['ndvi']:+.4f}  (vegetation)")
    print(f"  NDWI: {sample_indices['ndwi']:+.4f}  (water)")
    print(f"  NDBI: {sample_indices['ndbi']:+.4f}  (built-up)")

    # Store in DB
    print(f"\n{'='*60}")
    print("Storing scene metadata in database...")
    stored = store_scenes(scenes[:5])
    print(f"Stored {stored} scenes in satellite_data table.")


if __name__ == "__main__":
    main()
