-- Jednorazowe przemianowanie wersji migracji po scaleniu lipca 2026 (07–10.07 → 06.07).
-- Uruchom na produkcji PRZED doctrine:migrations:migrate, gdy w doctrine_migration_versions
-- są stare nazwy (07120000–10120000), a w repo są już 06140100–06140400.
--
-- Każdy UPDATE osobno (z katalogu backend/ na serwerze):
--   php bin/console dbal:run-sql "UPDATE doctrine_migration_versions SET version = 'App\\Migrations\\Version20260706140100' WHERE version = 'App\\Migrations\\Version20260707120000'" --env=prod
-- (w bash na serwerze użyj poczwórnych backslashy — patrz scripts/deploy.sh)
--
-- Lub przez mariadb — poniższe UPDATE z podwójnym backslashem w literale SQL:

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
