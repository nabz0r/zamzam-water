import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, String, Text
from sqlalchemy.dialects.postgresql import UUID

from api.database import Base


class HydroMonitoring(Base):
    __tablename__ = "hydro_monitoring"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    metric = Column(String(100), nullable=False)  # water_level, rainfall, flow_rate, temperature
    value = Column(Float, nullable=False)
    unit = Column(String(50), nullable=False)  # m, mm, L/s, °C
    measured_at = Column(DateTime, nullable=False)
    station = Column(String(200))  # zamzam_well, wadi_ibrahim_gauge
    latitude = Column(Float)
    longitude = Column(Float)
    source = Column(String(100))  # open_meteo, sgs, manual
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
