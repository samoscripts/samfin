.PHONY: up down build restart logs shell sf npm migrate cc fix-frontend-node-modules build-info build-frontend-prod deploy deploy-full-rsync

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

build-info:
	docker compose exec frontend node scripts/generate-build-info.mjs

# Production frontend build (same env as deploy); run after: docker compose up -d
build-frontend-prod:
	docker compose exec -T -e HOME=/app -e NPM_CONFIG_CACHE=/app/.npm-cache frontend npm ci
	docker compose exec -T -e HOME=/app frontend npm run build

# One-time fix when frontend_node_modules volume was created as root (EACCES on npm install)
fix-frontend-node-modules:
	docker run --rm -v fin_frontend_node_modules:/app/node_modules node:lts-alpine \
		chown -R $$(grep '^HOST_UID=' .env 2>/dev/null | cut -d= -f2 || echo 1000):$$(grep '^HOST_GID=' .env 2>/dev/null | cut -d= -f2 || echo 1000) /app/node_modules
	@echo "✓ node_modules volume ownership updated — run: docker compose up -d frontend"

# ── Deploy (production) ───────────────────────────────────────────────────────

deploy:
	bash scripts/deploy.sh

deploy-full-rsync:
	bash scripts/deploy.sh --full-rsync

# ── Setup (pierwsze uruchomienie) ─────────────────────────────────────────────

setup: build composer-install
	@echo "✓ SamFin gotowy"
	@echo "  Backend:  http://localhost:3001/api/health"
	@echo "  Frontend: http://localhost:5173"
