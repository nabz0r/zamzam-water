import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, String, Text
from sqlalchemy.dialects.postgresql import JSON, UUID

from api.database import Base


class ArchaeologicalSite(Base):
    __tablename__ = "archaeological_sites"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name_en = Column(String(200), nullable=False)
    name_ar = Column(String(200))
    quranic_name = Column(String(200))
    surah_refs = Column(Text)  # comma-separated surah:ayah references
    latitude = Column(Float)
    longitude = Column(Float)
    modern_location = Column(String(300))
    country = Column(String(100))
    evidence_status = Column(String(50), nullable=False)  # confirmed, partial, investigation, unlocated
    description = Column(Text)
    archaeological_refs = Column(Text)  # key excavation references
    geojson = Column(JSON)  # full GeoJSON feature for complex geometries
    source = Column(String(100))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
