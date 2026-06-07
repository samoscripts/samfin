.PHONY: up down build restart logs shell sf npm migrate cc

# ── Docker ────────────────────────────────────────────────────────────────────

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose up -d --build

restart:
	docker compose restart

logs:
	docker compose logs -f

logs-app:
	docker compose logs -f app

# ── Symfony ───────────────────────────────────────────────────────────────────

shell:
	docker compose exec app bash

composer-install:
	docker compose exec app composer install

cc:
	docker compose exec app php bin/console cache:clear

sf:
	docker compose exec app php bin/console $(CMD)

migrate:
	docker compose exec app php bin/console doctrine:migrations:migrate --no-interaction

routes:
	docker compose exec app php bin/console debug:router

# ── Frontend ──────────────────────────────────────────────────────────────────

shell-frontend:
	docker compose exec frontend sh

npm:
	docker compose exec frontend npm $(CMD)

# ── Setup (pierwsze uruchomienie) ─────────────────────────────────────────────

setup: build composer-install
	@echo "✓ SamFin gotowy"
	@echo "  Backend:  http://localhost:3001/api/health"
	@echo "  Frontend: http://localhost:5173"
