.DEFAULT_GOAL := help

.PHONY: help up down build restart logs shell sf npm migrate cc sync fix-frontend-node-modules build-info build-frontend-prod deploy deploy-all deploy-full-rsync git-deploy-alias mobile-install mobile-sync mobile-open mobile-doctor mobile-setup-android mobile-build-apk mobile-build mobile-build-i mobile-copy-apk mobile-install-apk mobile-icons test test-fe test-all test-db-setup test-db-migrate

# ── Help ──────────────────────────────────────────────────────────────────────

help:
	@echo "SamFin — dostępne komendy (uruchamiaj z katalogu fin/)"
	@echo "Wywołanie: make   lub   make help"
	@echo ""
	@echo "Docker:"
	@echo "  make up              uruchom kontenery"
	@echo "  make down            zatrzymaj kontenery"
	@echo "  make build           build + uruchom"
	@echo "  make restart         restart kontenerów"
	@echo "  make logs            logi wszystkich serwisów"
	@echo "  make logs-app        logi kontenera app"
	@echo ""
	@echo "Backend (Symfony):"
	@echo "  make migrate         migracje Doctrine (w kontenerze)"
	@echo "  make shell           powłoka w kontenerze app"
	@echo "  make sf CMD=...      php bin/console ..."
	@echo "  make composer-install  composer install w kontenerze"
	@echo "  make cc              cache:clear"
	@echo "  make sync            po git pull: composer + cache + migracje"
	@echo "  make routes          debug:router"
	@echo "  make test            PHPUnit (APP_ENV=test, w kontenerze)"
	@echo "  make test-fe         Vitest (frontend, w kontenerze)"
	@echo "  make test-all        PHPUnit + Vitest"
	@echo "  make test-db-migrate migracje na bazie samfin_test"
	@echo "  make test-db-setup   utwórz samfin_test + migracje (jednorazowo)"
	@echo "  (CI: .github/workflows/tests.yml — push/PR na main)"
	@echo ""
	@echo "Frontend:"
	@echo "  make npm CMD=...     npm w kontenerze frontend"
	@echo "  make test-fe         Vitest (npm run test)"
	@echo "  make build-frontend-prod  test + build produkcyjny frontendu"
	@echo "  make build-info      generuj build_info.json"
	@echo ""
	@echo "Deploy:"
	@echo "  make deploy              deploy frontendu na produkcję"
	@echo "  make deploy-all          git add/commit/push (poprawki) + deploy"
	@echo "  git deploy -all          to samo (jednorazowo: make git-deploy-alias)"
	@echo "  make deploy-full-rsync   pełny rsync backendu"
	@echo ""
	@echo "Mobile (Capacitor / Android):"
	@echo "  make mobile-install      npm install w mobile/ (Node 20)"
	@echo "  make mobile-sync         cap sync android (po zmianach capacitor.config / pluginów)"
	@echo "  make mobile-build-apk    zbuduj debug APK w WSL (Gradle, JDK 21)"
	@echo "  make mobile-build        mobile-sync + mobile-build-apk (pyta o kopiowanie do downloads/)"
	@echo "  make mobile-build-i      jak mobile-build, ale kopiuje APK do downloads/ bez pytania"
	@echo "  make mobile-copy-apk     skopiuj APK do Pobranych Windows"
	@echo "  make mobile-install-apk  adb install -r na telefon (adb.exe z Windows)"
	@echo "  make mobile-icons        ikona apki: podmień PNG → generuj mipmap → make mobile-build"
	@echo "  make mobile-open         otwórz Android Studio (opcjonalnie)"
	@echo "  make mobile-doctor       diagnostyka Capacitor"
	@echo "  make mobile-setup-android  pierwszy raz: add android + sync"
	@echo ""
	@echo "Inne:"
	@echo "  make setup           pierwsze uruchomienie projektu"
	@echo ""
	@echo "Szczegóły mobile: mobile/README.md"

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

sync: composer-install cc migrate

sf:
	docker compose exec app php bin/console $(CMD)

migrate:
	docker compose exec -u www-data -T app php bin/console doctrine:migrations:migrate --no-interaction

routes:
	docker compose exec app php bin/console debug:router

test-db-setup:
	docker compose exec -T db mariadb -uroot -proot -e "CREATE DATABASE IF NOT EXISTS samfin_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; GRANT ALL ON samfin_test.* TO 'samfin'@'%'; FLUSH PRIVILEGES;"
	$(MAKE) test-db-migrate

test-db-migrate:
	docker compose exec -e APP_ENV=test -u www-data -T app php bin/console doctrine:migrations:migrate --no-interaction

test:
	docker compose exec -e APP_ENV=test -u www-data -T app vendor/bin/phpunit

test-fe:
	docker compose exec -T -e HOME=/app -e NPM_CONFIG_CACHE=/app/.npm-cache frontend npm run test

test-all: test test-fe

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
	docker compose exec -T -e HOME=/app frontend npm run test
	docker compose exec -T -e HOME=/app frontend npm run build

# One-time fix when frontend_node_modules volume was created as root (EACCES on npm install)
fix-frontend-node-modules:
	docker run --rm -v fin_frontend_node_modules:/app/node_modules node:lts-alpine \
		chown -R $$(grep '^HOST_UID=' .env 2>/dev/null | cut -d= -f2 || echo 1000):$$(grep '^HOST_GID=' .env 2>/dev/null | cut -d= -f2 || echo 1000) /app/node_modules
	@echo "✓ node_modules volume ownership updated — run: docker compose up -d frontend"

# ── Deploy (production) ───────────────────────────────────────────────────────

deploy:
	bash scripts/deploy.sh

deploy-all:
	bash scripts/deploy.sh --all

git-deploy-alias:
	git config alias.deploy '!f() { root="$$(git rev-parse --show-toplevel)"; bash "$$root/scripts/deploy.sh" "$$@"; }; f'
	@echo "✓ git deploy — uruchom: git deploy   lub   git deploy -all"

deploy-full-rsync:
	bash scripts/deploy.sh --full-rsync

# ── Mobile (Capacitor / Android) ──────────────────────────────────────────────
# npm + cap sync w WSL (Node >= 20). APK: make mobile-build-apk (JDK 21 + Android SDK) — patrz mobile/README.md

# Usuń CRLF z edycji na Windows (inaczej: set: pipefail — invalid option)
define run_mobile_script
	sed -i 's/\r$$//' $(1)
	bash $(1)
endef

mobile-install:
	bash -lc 'source $$HOME/.nvm/nvm.sh && nvm use 20 && cd mobile && npm install'

mobile-sync:
	bash -lc 'source $$HOME/.nvm/nvm.sh && nvm use 20 && cd mobile && npx cap sync android'

mobile-build-apk:
	$(call run_mobile_script,mobile/scripts/build-apk.sh)

mobile-build: mobile-sync mobile-build-apk

mobile-build-i: mobile-sync
	$(call run_mobile_script,mobile/scripts/build-apk.sh -i)

mobile-copy-apk:
	$(call run_mobile_script,mobile/scripts/copy-apk-windows.sh)

mobile-install-apk:
	$(call run_mobile_script,mobile/scripts/install-apk-windows.sh)

mobile-open:
	bash -lc 'source $$HOME/.nvm/nvm.sh && nvm use 20 && cd mobile && npx cap open android'

mobile-doctor:
	bash -lc 'source $$HOME/.nvm/nvm.sh && nvm use 20 && cd mobile && npx cap doctor'

mobile-setup-android:
	$(call run_mobile_script,mobile/scripts/setup-android.sh)

# Ikona launchera: frontend/public/images/samfin_logo_ico.png → mipmap-*/ic_launcher*.png
# Po zmianie logo: make mobile-icons && make mobile-build && make mobile-install-apk
mobile-icons:
	python3 mobile/scripts/generate-icons.py

# ── Setup (pierwsze uruchomienie) ─────────────────────────────────────────────

setup: build composer-install
	@echo "✓ SamFin gotowy"
	@echo "  Backend:  http://localhost:3001/api/health"
	@echo "  Frontend: http://localhost:5173"
