import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.database import get_db
from api.models.publication import Publication

router = APIRouter(prefix="/api/v1/publications", tags=["publications"])


@router.get("")
async def list_publications(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    year: Optional[int] = None,
    journal: Optional[str] = None,
    relevant_only: bool = Query(True, description="Filter to relevant Zamzam papers only"),
    db: AsyncSession = Depends(get_db),
):
    """List publications with pagination and optional filters."""
    query = select(Publication)

    if relevant_only:
        query = query.where(Publication.is_relevant == True)  # noqa: E712
    if year:
        query = query.where(Publication.year == year)
    if journal:
        query = query.where(Publication.journal.ilike(f"%{journal}%"))

    query = query.order_by(Publication.year.desc().nullslast())

    # Count
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    # Paginate
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    pubs = result.scalars().all()

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "results": [
            {
                "id": str(p.id),
                "title": p.title,
                "authors": p.authors,
                "journal": p.journal,
                "year": p.year,
                "doi": p.doi,
                "pmid": p.pmid,
                "source": p.source,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in pubs
        ],
    }


@router.get("/search")
async def search_publications(
    q: str = Query("", min_length=0),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    mode: str = Query("auto", pattern="^(auto|text|semantic)$"),
    db: AsyncSession = Depends(get_db),
):
    """Search publications. Modes: auto (semantic if available, else text), text (ilike), semantic (pgvector).
    Empty query returns all papers paginated (same as list endpoint)."""
    # Empty query → return all relevant papers
    if not q.strip():
        query = select(Publication).where(
            Publication.is_relevant == True  # noqa: E712
        ).order_by(Publication.year.desc().nullslast())
        count_q = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_q)).scalar()
        query = query.offset((page - 1) * per_page).limit(per_page)
        result = await db.execute(query)
        pubs = result.scalars().all()
        return {
            "total": total,
            "page": page,
            "per_page": per_page,
            "query": q,
            "mode": "text",
            "results": [
                {
                    "id": str(p.id),
                    "title": p.title,
                    "authors": p.authors,
                    "journal": p.journal,
                    "year": p.year,
                    "doi": p.doi,
                    "pmid": p.pmid,
                    "abstract": p.abstract[:300] + "..." if p.abstract and len(p.abstract) > 300 else p.abstract,
                }
                for p in pubs
            ],
        }

    # Try semantic search first if mode allows
    if mode in ("auto", "semantic"):
        try:
            from api.services.embeddings import semantic_search
            results = await semantic_search(q, limit=per_page)
            if results:
                return {
                    "total": len(results),
                    "page": 1,
                    "per_page": per_page,
                    "query": q,
                    "mode": "semantic",
                    "results": results,
                }
        except Exception:
            pass
        if mode == "semantic":
            return {"total": 0, "page": 1, "per_page": per_page, "query": q,
                    "mode": "semantic", "results": [],
                    "error": "Semantic search unavailable (Ollama not running or no embeddings)"}

    # Fallback to text search (ilike)
    pattern = f"%{q}%"
    query = (
        select(Publication)
        .where(
            or_(
                Publication.title.ilike(pattern),
                Publication.abstract.ilike(pattern),
            )
        )
        .order_by(Publication.year.desc().nullslast())
    )

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    pubs = result.scalars().all()

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "query": q,
        "mode": "text",
        "results": [
            {
                "id": str(p.id),
                "title": p.title,
                "authors": p.authors,
                "journal": p.journal,
                "year": p.year,
                "doi": p.doi,
                "pmid": p.pmid,
                "abstract": p.abstract[:300] + "..." if p.abstract and len(p.abstract) > 300 else p.abstract,
            }
            for p in pubs
        ],
    }


@router.get("/{pub_id}")
async def get_publication(pub_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Get a single publication by ID."""
    result = await db.execute(select(Publication).where(Publication.id == pub_id))
    pub = result.scalar_one_or_none()
    if pub is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Publication not found")
    return {
        "id": str(pub.id),
        "title": pub.title,
        "authors": pub.authors,
        "journal": pub.journal,
        "year": pub.year,
        "doi": pub.doi,
        "pmid": pub.pmid,
        "abstract": pub.abstract,
        "source": pub.source,
        "notes": pub.notes,
        "created_at": pub.created_at.isoformat() if pub.created_at else None,
        "updated_at": pub.updated_at.isoformat() if pub.updated_at else None,
    }
