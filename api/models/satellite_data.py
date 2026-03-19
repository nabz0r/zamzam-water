import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID

from api.database import Base


class SatelliteData(Base):
    __tablename__ = "satellite_data"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    satellite = Column(String(50), nullable=False)  # sentinel-2, landsat-8
    band = Column(String(50))  # B04, NDVI, thermal
    acquisition_date = Column(DateTime, nullable=False)
    cloud_cover = Column(Float)
    resolution_m = Column(Integer)
    file_path = Column(String(500))  # path to GeoTIFF in data/
    bbox_wkt = Column(Text)  # WKT polygon (PostGIS geometry added later)
    source = Column(String(100))  # gee, copernicus, usgs
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
