-- Przemianowanie migracji lipiec 2026 (seria 07–10.07 → 06.07, zachowana kolejność DDL).
-- Uruchom na KAŻDEJ bazie (dev, prod, samfin_test) PO deployu plików z repo.
-- Wymaga: stare wersje już wykonane; nowe pliki już w backend/migrations/.
--
-- Mapowanie:
--   Version20260707120000 → Version20260706140100  (user_category_pick_event)
--   Version20260708120000 → Version20260706140200  (category ADR-036)
--   Version20260709120000 → Version20260706140300  (trans_custom_description)
--   Version20260710120000 → Version20260706140400  (Model B rotacji)
--
-- Dev (Docker):
--   docker compose exec -T db mariadb -usamfin -psamfin samfin < backend/scripts/rename-migrations-20260706.sql
--
-- Prod (hosting, bez Dockera):
--   mysql -u ... -p samfin < backend/scripts/rename-migrations-20260706.sql

UPDATE doctrine_migration_versions
SET version = 'App\\Migrations\\Version20260706140100'
WHERE version = 'App\\Migrations\\Version20260707120000';

UPDATE doctrine_migration_versions
SET version = 'App\\Migrations\\Version20260706140200'
WHERE version = 'App\\Migrations\\Version20260708120000';

UPDATE doctrine_migration_versions
SET version = 'App\\Migrations\\Version20260706140300'
WHERE version = 'App\\Migrations\\Version20260709120000';

UPDATE doctrine_migration_versions
SET version = 'App\\Migrations\\Version20260706140400'
WHERE version = 'App\\Migrations\\Version20260710120000';
