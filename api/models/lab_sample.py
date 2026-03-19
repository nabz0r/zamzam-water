import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, String, Text
from sqlalchemy.dialects.postgresql import UUID

from api.database import Base


class LabSample(Base):
    __tablename__ = "lab_samples"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    batch_id = Column(String(100), nullable=False)
    sample_label = Column(String(200), nullable=False)
    collection_date = Column(DateTime)
    collection_location = Column(String(300))
    element = Column(String(50), nullable=False)
    value = Column(Float, nullable=False)
    unit = Column(String(50), nullable=False)
    analytical_method = Column(String(200))
    lab_name = Column(String(300))
    protocol = Column(Text)  # sampling protocol description
    certificate_path = Column(String(500))  # path to lab certificate PDF
    source = Column(String(100), default="lab")
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
