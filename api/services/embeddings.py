"""Embedding generation via Ollama REST API for pgvector semantic search."""

from typing import Optional

import httpx
from sqlalchemy import create_engine, select, update
from sqlalchemy.orm import Session

from api.config import settings
from api.models.publication import Publication

EMBEDDING_MODEL = "nomic-embed-text"


def generate_embedding(text: str) -> Optional[list[float]]:
    """Generate an embedding vector via Ollama REST API.

    Returns None if Ollama is unavailable or errors.
    """
    if not text or not text.strip():
        return None
    try:
        resp = httpx.post(
            f"{settings.ollama_base_url}/api/embeddings",
            json={"model": EMBEDDING_MODEL, "prompt": text[:8000]},
            timeout=30.0,
        )
        if resp.status_code == 200:
            data = resp.json()
            return data.get("embedding")
    except Exception:
        pass
    return None


def generate_embeddings_batch(session: Optional[Session] = None) -> dict:
    """Generate embeddings for all publications missing them.

    Returns stats dict.
    """
    own_session = False
    if session is None:
        engine = create_engine(settings.database_url_sync)
        session = Session(engine)
        own_session = True

    try:
        stats = {"total": 0, "processed": 0, "failed": 0, "skipped": 0}

        pubs = session.execute(
            select(Publication).where(
                Publication.abstract.isnot(None),
                Publication.embedding.is_(None),
            )
        ).scalars().all()
        stats["total"] = len(pubs)

        for pub in pubs:
            text = f"{pub.title or ''}\n\n{pub.abstract or ''}"
            embedding = generate_embedding(text)
            if embedding:
                pub.embedding = embedding
                stats["processed"] += 1
            else:
                stats["failed"] += 1

        session.commit()
        return stats

    finally:
        if own_session:
            session.close()


async def semantic_search(query: str, limit: int = 20) -> list[dict]:
    """Perform semantic search: embed query, then find nearest neighbors.

    Falls back to empty list if Ollama is unavailable.
    """
    query_embedding = generate_embedding(query)
    if not query_embedding:
        return []

    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker

    engine = create_async_engine(settings.database_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # pgvector cosine distance: <=> operator
        from sqlalchemy import text
        result = await session.execute(
            text("""
                SELECT id, title, authors, journal, year, doi, pmid, abstract,
                       embedding <=> :query_vec::vector AS distance
                FROM publications
                WHERE embedding IS NOT NULL
                ORDER BY embedding <=> :query_vec::vector
                LIMIT :limit
            """),
            {"query_vec": str(query_embedding), "limit": limit},
        )
        rows = result.fetchall()

    await engine.dispose()

    return [
        {
            "id": str(row.id),
            "title": row.title,
            "authors": row.authors,
            "journal": row.journal,
            "year": row.year,
            "doi": row.doi,
            "pmid": row.pmid,
            "abstract": row.abstract[:300] + "..." if row.abstract and len(row.abstract) > 300 else row.abstract,
            "distance": round(row.distance, 4),
        }
        for row in rows
    ]
