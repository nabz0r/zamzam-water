.PHONY: setup api worker dashboard test seed ingest fetch-satellite sync-hydro parse-pdfs

setup:
	cp -n .env.example .env || true
	docker compose up -d
	pip install -r requirements.txt
	PYTHONPATH=. alembic upgrade head
	PYTHONPATH=. python3 scripts/seed_known_data.py

api:
	PYTHONPATH=. uvicorn api.main:app --reload --host 0.0.0.0 --port 8000

worker:
	PYTHONPATH=. celery -A api.tasks.celery_app worker -l info

beat:
	PYTHONPATH=. celery -A api.tasks.celery_app beat -l info

dashboard:
	cd dashboard && npm install && npm run dev

build-dashboard:
	cd dashboard && npm install && npx vite build

test:
	@echo "=== Health check ==="
	curl -s http://localhost:8000/health | python3 -m json.tool
	@echo "\n=== Publications ==="
	curl -s http://localhost:8000/api/v1/publications | python3 -m json.tool | head -5
	@echo "\n=== Chemistry ==="
	curl -s http://localhost:8000/api/v1/chemistry/elements | python3 -m json.tool | head -10
	@echo "\n=== Archaeology ==="
	curl -s http://localhost:8000/api/v1/archaeology/sites | python3 -m json.tool | head -5
	@echo "\n=== Hydro ==="
	curl -s http://localhost:8000/api/v1/hydro/stats | python3 -m json.tool | head -10
	@echo "\n=== Satellite ==="
	curl -s http://localhost:8000/api/v1/satellite/stats | python3 -m json.tool
	@echo "\n=== Lab ==="
	curl -s http://localhost:8000/api/v1/lab/samples | python3 -m json.tool

seed:
	PYTHONPATH=. python3 scripts/seed_known_data.py

ingest:
	curl -X POST http://localhost:8000/api/v1/tasks/ingest-papers | python3 -m json.tool

fetch-satellite:
	curl -X POST http://localhost:8000/api/v1/tasks/fetch-satellite | python3 -m json.tool

sync-hydro:
	curl -X POST http://localhost:8000/api/v1/tasks/sync-hydro | python3 -m json.tool

parse-pdfs:
	curl -X POST http://localhost:8000/api/v1/tasks/parse-pdfs | python3 -m json.tool

migrate:
	PYTHONPATH=. alembic revision --autogenerate -m "$(msg)"
	PYTHONPATH=. alembic upgrade head
