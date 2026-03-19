import csv
import io
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from api.database import get_db
from api.models.lab_sample import LabSample
from api.models.chemical_analysis import ChemicalAnalysis

router = APIRouter(prefix="/api/v1/lab", tags=["lab"])


class SampleCreate(BaseModel):
    batch_id: str
    sample_label: str
    collection_date: Optional[str] = None
    collection_location: Optional[str] = None
    collector: Optional[str] = None
    transport_method: Optional[str] = None
    notes: Optional[str] = None


class SampleResponse(BaseModel):
    id: str
    batch_id: str
    sample_label: str
    status: str
    collection_date: Optional[str] = None
    collection_location: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None


@router.post("/samples")
async def create_sample(sample: SampleCreate, db: AsyncSession = Depends(get_db)):
    """Create a new lab sample batch."""
    new_sample = LabSample(
        id=uuid.uuid4(),
        batch_id=sample.batch_id,
        sample_label=sample.sample_label,
        collection_date=datetime.fromisoformat(sample.collection_date) if sample.collection_date else None,
        collection_location=sample.collection_location,
        element="pending",
        value=0,
        unit="-",
        protocol=sample.transport_method,
        source="own_lab",
        notes=f"collector={sample.collector or 'unknown'}; {sample.notes or ''}",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(new_sample)
    await db.commit()
    return {
        "id": str(new_sample.id),
        "batch_id": new_sample.batch_id,
        "sample_label": new_sample.sample_label,
        "status": "pending",
    }


@router.post("/samples/{sample_id}/results")
async def upload_results(
    sample_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload CSV lab results for a sample. Auto-inserts into chemical_analyses.

    Expected CSV format: element,value,unit,method
    """
    # Verify sample exists
    result = await db.execute(select(LabSample).where(LabSample.id == sample_id))
    sample = result.scalar_one_or_none()
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")

    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    inserted = 0
    for row in reader:
        element = row.get("element", "").strip()
        value_str = row.get("value", "").strip()
        unit = row.get("unit", "mg/L").strip()
        method = row.get("method", "").strip()

        if not element or not value_str:
            continue

        try:
            value = float(value_str)
        except ValueError:
            continue

        analysis = ChemicalAnalysis(
            id=uuid.uuid4(),
            sample_source="zamzam",
            element=element,
            value=value,
            unit=unit,
            analytical_method=method,
            sample_location=sample.collection_location,
            source="own_lab",
            notes=f"batch={sample.batch_id}, sample={sample.sample_label}",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(analysis)
        inserted += 1

    # Update sample status
    sample.element = "analyzed"
    sample.notes = (sample.notes or "") + f"; results_uploaded={inserted}"
    sample.updated_at = datetime.utcnow()
    await db.commit()

    return {
        "sample_id": str(sample_id),
        "results_inserted": inserted,
        "status": "analyzed",
    }


@router.get("/samples")
async def list_samples(
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """List all lab samples with status."""
    query = select(LabSample).order_by(LabSample.created_at.desc())
    if status:
        query = query.where(LabSample.element == status)

    result = await db.execute(query)
    samples = result.scalars().all()

    return {
        "total": len(samples),
        "samples": [
            {
                "id": str(s.id),
                "batch_id": s.batch_id,
                "sample_label": s.sample_label,
                "status": s.element if s.element in ("pending", "received", "analyzed", "published") else "pending",
                "collection_date": s.collection_date.isoformat() if s.collection_date else None,
                "collection_location": s.collection_location,
                "lab_name": s.lab_name,
                "notes": s.notes,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in samples
        ],
    }


@router.get("/samples/{sample_id}/report")
async def sample_report(sample_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Get formatted results for a sample."""
    result = await db.execute(select(LabSample).where(LabSample.id == sample_id))
    sample = result.scalar_one_or_none()
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")

    # Find associated chemical analyses
    analyses = await db.execute(
        select(ChemicalAnalysis).where(
            ChemicalAnalysis.source == "own_lab",
            ChemicalAnalysis.notes.ilike(f"%batch={sample.batch_id}%"),
        )
    )
    results = analyses.scalars().all()

    return {
        "sample": {
            "id": str(sample.id),
            "batch_id": sample.batch_id,
            "sample_label": sample.sample_label,
            "collection_date": sample.collection_date.isoformat() if sample.collection_date else None,
            "collection_location": sample.collection_location,
        },
        "results": [
            {
                "element": r.element,
                "value": r.value,
                "unit": r.unit,
                "method": r.analytical_method,
            }
            for r in results
        ],
    }
