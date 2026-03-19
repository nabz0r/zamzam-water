from api.tasks.celery_app import celery
from api.services.pubmed_scraper import run_scraper


@celery.task(name="api.tasks.ingest_papers.ingest_papers", bind=True, max_retries=3)
def ingest_papers(self):
    """Celery task: scrape PubMed for Zamzam publications and extract chemical data."""
    try:
        stats = run_scraper()
        return stats
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)
