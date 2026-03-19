from celery import Celery
from celery.schedules import crontab

from api.config import settings

celery = Celery(
    "zamzam",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "api.tasks.ingest_papers",
        "api.tasks.sync_hydro",
    ],
)

celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "ingest-papers-weekly": {
            "task": "api.tasks.ingest_papers.ingest_papers",
            "schedule": crontab(hour=3, minute=0, day_of_week=1),  # Monday 03:00 UTC
        },
        "sync-hydro-daily": {
            "task": "api.tasks.sync_hydro.sync_hydro",
            "schedule": crontab(hour=6, minute=0),  # Daily 06:00 UTC
        },
    },
)
