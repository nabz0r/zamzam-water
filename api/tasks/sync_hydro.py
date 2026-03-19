from api.tasks.celery_app import celery
from api.services.weather_fetcher import run_weather_sync


@celery.task(name="api.tasks.sync_hydro.sync_hydro", bind=True, max_retries=3)
def sync_hydro(self):
    """Celery task: sync weather data from Open-Meteo for Mecca."""
    try:
        stats = run_weather_sync()
        return stats
    except Exception as exc:
        raise self.retry(exc=exc, countdown=120)
