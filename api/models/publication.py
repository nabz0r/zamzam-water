import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, DateTime, Integer, String, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID

from api.config import settings
from api.database import Base


class Publication(Base):
    __tablename__ = "publications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(500), nullable=False)
    authors = Column(Text)
    journal = Column(String(300))
    year = Column(Integer)
    doi = Column(String(200), unique=True)
    pmid = Column(String(20), unique=True)
    abstract = Column(Text)
    pdf_path = Column(String(500))
    source = Column(String(100))  # pubmed, springer, manual
    is_relevant = Column(Boolean, default=None, nullable=True)  # None=unclassified, True=relevant, False=not relevant
    notes = Column(Text)
    embedding = Column(Vector(settings.embedding_dim))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
