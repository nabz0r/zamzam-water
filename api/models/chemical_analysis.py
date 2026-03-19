import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, String, Text
from sqlalchemy.dialects.postgresql import UUID

from api.database import Base


class ChemicalAnalysis(Base):
    __tablename__ = "chemical_analyses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sample_source = Column(String(200), nullable=False)  # zamzam, evian, vittel...
    element = Column(String(50), nullable=False)  # Ca, Mg, Na, pH, TDS...
    value = Column(Float, nullable=False)
    unit = Column(String(50), nullable=False)  # mg/L, µg/L, -
    analytical_method = Column(String(200))  # ICP-MS, ICP-OES...
    sample_location = Column(String(300))  # Masjid Al-Haram tap, bottled...
    publication_doi = Column(String(200))
    publication_year = Column(Integer)
    source = Column(String(100))  # paper, lab, database
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
