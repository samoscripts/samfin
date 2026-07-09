# Baza danych SamFin

Silnik: **MariaDB 11** (dev, Docker), **MySQL** (prod, hosting). Charset `utf8mb4_unicode_ci`, silnik InnoDB. Migracje Doctrine muszą być kompatybilne z oboma silnikami.

ORM: Doctrine 3. Migracje w `backend/migrations/` (23 pliki, chronologicznie od `Version20260607125328`).

## Lista tabel

| Tabela | Encja PHP | Opis |
|--------|-----------|------|
| `app_user` | `User` | Użytkownicy |
| `user_api_token` | `UserApiToken` | Tokeny API (wiele sesji na użytkownika) |
| `party` | `Party` | Podmioty |
| `party_bank_account` | `PartyBankAccount` | Rachunki bankowe podmiotów |
| `wallet` | `Wallet` | Portfele |
| `concern` | `Concern` | Obszary „dotyczy” |
| `category` | `Category` | Kategorie (drzewo) |
| `csv_import` | `CsvImport` | Nagłówki importów CSV |
| `csv_import_row` | `CsvImportRow` | Wiersze importu |
| `csv_import_error` | `CsvImportError` | Błędy importu |
| `transactions` | `Transaction` | Transakcje |
| `transaction_items` | `TransactionItem` | Pozycje transakcji |
| `transactions_change_log` | `TransactionChangeLog` | Historia klasyfikacji |
| `transactions_trash` | `TransactionTrash` | Snapshot usuniętych transakcji (przed hard DELETE) |
| `classification_rule` | `ClassificationRule` | Reguły auto-klasyfikacji per podmiot |
| `transaction_template` | `TransactionTemplate` | Szablony klasyfikacji per użytkownik (wpływ/wydatek) |
| `user_category_pick_event` | `UserCategoryPickEvent` | Log wyborów subkategorii per użytkownik i kierunek (`created_at`; purge po 90 dniach) |
| `settlement_config` | `SettlementConfig` | Konfiguracja rozliczenia wpłat (per `user_id`) |
| `settlement_period` | `SettlementPeriod` | Roczne okresy rozliczeniowe (snapshot przy zamknięciu) |
| `settlement_ledger_entry` | `SettlementLedgerEntry` | Indeks ledger rozliczeń (1 wiersz = 1 `transaction_item`, running state) |

## Diagram relacji (FK)

```mermaid
erDiagram
    app_user {
        int id PK
        string email UK
    }
    user_api_token {
        int id PK
        int user_id FK
        string token UK
        string name
        datetime created_at
        datetime last_used_at
    }
    party {
        int id PK
        int created_by FK
        int updated_by FK
    }
    party_bank_account {
        int id PK
        int party_id FK
    }
    wallet {
        int id PK
    }
    concern {
        int id PK
    }
    category {
        int id PK
        int parent_id FK
    }
    csv_import {
        int id PK
        int party_bank_account_id FK
        int party_id FK
    }
    csv_import_row {
        int id PK
        int csv_import_id FK
    }
    csv_import_error {
        int id PK
        int csv_import_id FK
    }
    classification_rule {
        int id PK
        int party_id FK
        int created_from_transaction_id FK
    }
    transactions {
        int id PK
        int import_id FK
        int import_row_id FK UK
        int paid_from_party_id FK
        int paid_to_party_id FK
        string counterparty_account_number
    }
    transaction_items {
        int id PK
        int transaction_id FK
        int wallet_id FK
        int concern_id FK
        int category_id FK
    }
    transactions_change_log {
        int id PK
        int transaction_id FK
        json snapshot_json
    }
    transaction_template {
        int id PK
        int user_id FK
        string direction
        int paid_from_party_id FK
        int paid_to_party_id FK
        int wallet_id FK
        int concern_id FK
        int category_id FK
    }

    party_bank_account }o--|| party : party_id_RESTRICT
    category }o--o| category : parent_id_SET_NULL
    csv_import }o--o| party_bank_account : SET_NULL
    csv_import }o--o| party : SET_NULL
    csv_import_row }o--|| csv_import : CASCADE
    csv_import_error }o--|| csv_import : CASCADE
    transactions }o--o| csv_import : SET_NULL
    transactions }o--o| csv_import_row : SET_NULL
    transactions }o--o| party : paid_from_SET_NULL
    transactions }o--o| party : paid_to_SET_NULL
    transaction_items }o--|| transactions : CASCADE
    transaction_items }o--o| wallet : SET_NULL
    transaction_items }o--o| concern : SET_NULL
    transaction_items }o--o| category : SET_NULL
    transactions_change_log }o--|| transactions : CASCADE
    transaction_template }o--|| app_user : user_id_CASCADE
    transaction_template }o--o| party : paid_from_SET_NULL
    transaction_template }o--o| party : paid_to_SET_NULL
    transaction_template }o--o| wallet : SET_NULL
    transaction_template }o--o| concern : SET_NULL
    transaction_template }o--o| category : SET_NULL
```

## Klucze obce — zachowanie ON DELETE

| Relacja | ON DELETE |
|---------|-----------|
| `party_bank_account.party_id` → `party` | **RESTRICT** (nie można usunąć podmiotu z rachunkami) |
| `category.parent_id` → `category` | SET NULL |
| `csv_import_row/error` → `csv_import` | CASCADE |
| `transaction_items` → `transactions` | CASCADE |
| `transactions_change_log` → `transactions` | CASCADE |
| Pozostałe FK do `party`, `wallet`, `concern`, `category`, `csv_import*` | SET NULL |
| `created_by` / `updated_by` → `app_user` | RESTRICT lub SET NULL (zależnie od tabeli) |

Nazwy constraintów FK w migracjach: sekcja [Reguły migracji Doctrine](#reguły-migracji-doctrine).

## Indeksy istotne dla zapytań

**transactions:** `trans_date`, `status`, `direction`, `import_id`, `paid_from_party_id`, `paid_to_party_id`, unikalny `import_row_id`.

**transaction_items:** `transaction_id`, `wallet_id`, `concern_id`, `category_id`.

**transactions_change_log:** `transaction_id`, `created_at`.

**user_api_token:** unikalny `token` (64 znaki hex); `user_id` (FK → `app_user`, CASCADE przy usunięciu użytkownika).

### Tabela `user_api_token`

| Kolumna | Typ | Opis |
|---------|-----|------|
| `id` | INT PK | |
| `user_id` | INT FK → `app_user` | Właściciel sesji; ON DELETE CASCADE |
| `token` | VARCHAR(64) UK | Token Bearer (hex); unikalny w całej bazie |
| `name` | VARCHAR(64) | Etykieta klienta (`web`, `mobile`, …) z body `clientName` przy logowaniu |
| `created_at` | DATETIME | Ustawiane w `PrePersist` |
| `last_used_at` | DATETIME NULL | Aktualizowane przy każdym uwierzytelnionym żądaniu API |

Historia: do 2026-06 jeden token w `app_user.api_token` (usunięty w migracji `Version20260705120000`).

## Chronologia migracji

| Wersja | Zmiana |
|--------|--------|
| `20260607125328` | `app_user` |
| `20260607153540` | `party`, `party_bank_account` |
| `20260607165000` | Seed admina |
| `20260607170000` | `wallet`, `concern`, `category` |
| `20260607191500` | `category.parent_id` |
| `20260607193000` | Audyt `created_by`/`updated_by` na encjach konfiguracyjnych |
| `20260607193500` | Rename indeksów Doctrine |
| `20260607200000` | Tabele importu CSV |
| `20260607200100`–`20260607200200` | Korekty indeksów i DEFAULT |
| `20260607204500` | Rename FK |
| `20260607220000` | `transactions`, `transaction_items` |
| `20260608000000` | Data: `parse_status` OK→VALIDATED, ERROR→PARSE_ERROR |
| `20260608120000` | `transactions_change_log` |
| `20260613120000` | `party`: `direction_usage_income`, `direction_usage_expense` (zastępuje `usage_type`) |
| `20260613140000` | Usunięcie `direction_usage_*` z `party` |
| `20260614120000` | `csv_import_row`: rename `account_raw` → `own_account_label_raw`; `counterparty_account_raw` |
| `20260614150000` | `classification_rule`; `transactions.counterparty_account_number` |
| `20260615120000` | Reguły klasyfikacji: warunek `direction` na początku `conditions_json` |
| `20260622120000` | `transaction_template` — szablony klasyfikacji per użytkownik |
| `20260623120000` | `category`: `direction_expense`, `direction_income` (zastępuje `type`; usunięte w `20260630120000`) |
| `20260630120000` | (historyczna — wersja w DB; treść zastąpiona przez `20260706140200`) |
| `20260706140200` | `category`: usunięcie `direction_expense`, `direction_income` (ADR-036) |
| `20260624120000` | Backfill `classification_rule.name` i `description` dla reguł z `created_from_transaction_id` |
| `20260625120000` | `common_account_settlement_config` — konfiguracja rozliczenia (historyczna nazwa) |
| `20260626120000` | Repair: utworzenie `common_account_settlement_config` jeśli brak (gdy `20260625120000` zapisana bez tabeli) |
| `20260627120000` | Rename: `settlement_config`, kolumna `settlement_party_id` (plik usunięty z repo — repair w `20260706120000`) |
| `20260628120000` | `settlement_ledger_entry`; kolumny indeksu na `settlement_config` (`reindex_from_date`, salda początkowe, `needs_refresh`, …) |
| `20260629120000` | `transactions_trash` — kosz snapshotów przed usunięciem transakcji |
| `20260630120000` | Repair: DDL CSV z `20260627120000` jeśli kolumny nie powstały przy pierwszym uruchomieniu |
| `20260701143022` | `transactions`: rename `title`→`operation_title`, `description`→`operation_desc`, `balance_after_minor`; reset `classification_rule` |
| `20260702120000` | `transactions`: rename `operation_*`→`trans_*`, `trans_localization`, drop `operation_type`, pełna kolejność kolumn; `csv_import_row.title_localization_raw`; reset `classification_rule` |
| `20260704143000` | Drop `trans_localization`, `csv_import_row.title_localization_raw`; reorder kolumn `transactions` po dropie |
| `20260705120000` | Multi-token auth: `user_api_token`, migracja z `app_user.api_token` |
| `20260706120000` | Repair: rename `common_account_settlement_config` → `settlement_config`; ledger + kolumny indeksu jeśli brak |
| `20260706133600` | `settlement_period` — roczne okresy rozliczeniowe ze snapshotem przy zamknięciu (ADR-038) |
| `20260706140100` | `user_category_pick_event` — log wyborów kategorii (najczęściej wybierane, okno 90 dni) |
| `20260706140200` | `category`: usunięcie `direction_expense`, `direction_income` (ADR-036) |
| `20260706140300` | `transactions` / `transaction_template`: `trans_custom_description` |
| `20260706140400` | `settlement_ledger_entry`: Model B rotacji (`anchor`, Σ wpłat); TRUNCATE ledger + `needs_refresh` |
| `20260708214916` | `report_saved` — zapisane parametry raportów Trend/Rozbicie (nazwa, opis, `params_json`) |
| `20260709231132` | `transaction_filter_saved` — zapisane presety filtrów listy transakcji (`filters`, `sort`, `perPage` w `params_json`) |

**Uwaga (2026-07-06):** migracje `07120000`–`10120000` przemianowano na `06140100`–`06140400` (ta sama kolejność DDL, jedna data w nazwie). Na istniejących bazach: `backend/scripts/rename-migrations-20260706.sql` lub deploy (`scripts/deploy.sh` robi UPDATE przed `migrate`).

## Zapytania diagnostyczne (tylko SELECT)

Baza działa w kontenerze Docker `db`. **Uruchamiaj wyłącznie zapytania `SELECT`** — nie wykonuj ręcznie `INSERT`, `UPDATE`, `DELETE` ani `ALTER` na produkcyjnej / deweloperskiej bazie. Zmiany danych i schematu idą przez migracje Doctrine (`make migrate`).

### Połączenie z CLI

Z katalogu projektu (WSL / Linux):

```bash
docker compose exec -T db mariadb -usamfin -psamfin samfin
```

Jednorazowe zapytanie (bez wchodzenia do shella):

```bash
docker compose exec -T db mariadb -usamfin -psamfin samfin -e "SELECT COUNT(*) FROM classification_rule;"
```

Wiele zapytań naraz (heredoc — wygodne przy dłuższym SQL):

```bash
docker compose exec -T db mariadb -usamfin -psamfin samfin <<'EOSQL'
SELECT version, executed_at
FROM doctrine_migration_versions
ORDER BY executed_at DESC
LIMIT 5;
EOSQL
```

Parametry połączenia (z `docker-compose.yml`): baza `samfin`, użytkownik `samfin`, hasło `samfin`, host wewnątrz Compose: `db`, port na hoście: `3306`.

### Przykłady SELECT — migracje

```sql
-- Czy konkretna migracja została wykonana?
SELECT version, executed_at
FROM doctrine_migration_versions
WHERE version LIKE '%20260625120000%';

-- Ostatnie migracje
SELECT version, executed_at
FROM doctrine_migration_versions
ORDER BY executed_at DESC
LIMIT 10;
```

### Przykłady SELECT — reguły klasyfikacji

```sql
-- Wszystkie aktywne reguły (po backfillu nazwa: kategoria/podkategoria)
SELECT id, name, LEFT(description, 40) AS description, created_from_transaction_id
FROM classification_rule
WHERE active = 1
ORDER BY id;

-- Podgląd źródłowej kategorii dla reguły
SELECT cr.id AS rule_id, cr.name, c.name AS category_name, p.name AS parent_name, t.description AS tx_description
FROM classification_rule cr
JOIN transactions t ON t.id = cr.created_from_transaction_id
LEFT JOIN transaction_items ti ON ti.transaction_id = t.id AND ti.category_id IS NOT NULL
LEFT JOIN category c ON c.id = ti.category_id
LEFT JOIN category p ON c.parent_id = p.id
WHERE cr.active = 1 AND cr.created_from_transaction_id IS NOT NULL
ORDER BY cr.id, ti.id
LIMIT 20;
```

Status migracji Doctrine (alternatywa dla SQL):

```bash
docker compose exec -T app php bin/console doctrine:migrations:status
```

## Konwencja kwot

Wszystkie kwoty pieniężne w DB: **`INT` grosze** (`amount_minor`).

- Przychody (`direction = INCOME`): `amount_minor` dodatnie w agregatach stats.
- Wydatki (`direction = EXPENSE`): w stats używane `ABS(amount_minor)`.
- Import CSV: znak kwoty z pliku decyduje o `direction` (≥0 → INCOME, <0 → EXPENSE).

## Soft delete

Brak kolumny `deleted_at` na encjach operacyjnych. Dezaktywacja przez `active = false` w: `party`, `party_bank_account`, `wallet`, `concern`, `category`, `app_user`.

**Transakcje:** usunięcie użytkownika = hard `DELETE` z `transactions` po zapisie pełnego snapshotu w `transactions_trash` (`snapshot_json`, `original_transaction_id`, `deleted_at`, `deleted_by`). Usunięty wpis nie występuje w listach, statystykach, regułach ani raportach. Przyszły widok kosza — osobny endpoint na `transactions_trash` (poza MVP).

## Seed danych

Jedyna migracja seedująca dane biznesowe: konto `admin@samfin.local`. Słowniki konfiguracyjne (kategorie, portfele itd.) **nie są seedowane** — użytkownik tworzy je przez UI/API.

## Reguły migracji Doctrine

Dwie zasady obowiązkowe przy każdej zmianie schematu. Szczegóły operacyjne (Docker, diff): [`.cursor/rules/docker-migrations.mdc`](../.cursor/rules/docker-migrations.mdc). Checklist dla AI: [`docs/ai-guidelines.md`](../ai-guidelines.md#migracje-bazy-danych).

### Zasada 1 — nie modyfikuj wykonanych migracji

**Migracja zapisana w `doctrine_migration_versions` jest niemodyfikowalna** — na dev, w repo i na produkcji.

Doctrine śledzi migracje wyłącznie po **numerze wersji** (`VersionYYYYMMDDHHMMSS`), nie po treści pliku ani hashu. Jeśli plik w `backend/migrations/` zmienisz po `migrate`, silnik uznaje wersję za wykonaną i **nie uruchomi** nowego SQL.

| ❌ Zabronione | ✅ Zamiast tego |
|---------------|-----------------|
| Nadpisanie `up()` / `down()` w istniejącym pliku | **Nowy** plik migracji (`diff` lub `generate`) |
| Ponowne użycie numeru wersji pod inną treść | Nowy timestamp z CLI |
| Usunięcie wpisu z `doctrine_migration_versions` i ponowne `migrate` | Idempotentny `up()` w nowej migracji (`if ($schema->hasTable(...)) return;`) |
| Ręczny `CREATE TABLE` / `ALTER` poza migracją | `doctrine:migrations:diff` → `make migrate` |

**Objawy złamania zasady:** `doctrine:migrations:migrate` zwraca *Already at the latest version*, a aplikacja rzuca `Table '…' doesn't exist` (500).

**Przypadek z projektu (2026-07):** `Version20260706140400` (dawniej `10120000`) była już wykonana (Model B rotacji). Nadpisanie tego pliku treścią `CREATE TABLE settlement_period` nie utworzyło tabeli — poprawka wymagała **osobnej** migracji `Version20260706133600`.

**Jak sprawdzić przed edycją pliku:**

```bash
docker compose exec -u www-data -T app php bin/console doctrine:migrations:status
```

```sql
SELECT version, executed_at
FROM doctrine_migration_versions
WHERE version LIKE '%Version20260706140400%';
```

Jeśli wiersz istnieje — pliku **nie edytuj**; dodaj nową migrację.

**Po każdej nowej migracji:** wpis w [Chronologii migracji](#chronologia-migracji) poniżej oraz w ADR (jeśli dotyczy decyzji architektonicznej).

### Zasada 2 — nazewnictwo migracji

**Jedna konwencja** dla plików w `backend/migrations/` i dla `ADD CONSTRAINT … FOREIGN KEY` w metodzie `up()`.

#### Plik migracji

| Reguła | Opis |
|--------|------|
| Format nazwy | `VersionYYYYMMDDHHMMSS.php` — **wyłącznie** timestamp z generatora Doctrine |
| Tworzenie | `doctrine:migrations:diff` (po zmianie encji) lub `doctrine:migrations:generate` — **nie** wymyślać numeru wersji ręcznie |
| Timestamp | Rzeczywista data i czas z CLI (np. `Version20260701143022.php`). **Bez** sztucznych sufiksów (`120000`, „+1 dzień”, stała godzina `120000` dla wielu plików tego samego dnia) |
| Kolejność | Nowa migracja musi mieć wersję **leksykograficznie większą** niż ostatnia w repo (`doctrine:migrations:status` → Latest). Po uporządkowaniu lipca 2026 ostatnia to `Version20260706140400` |
| Jedna zmiana | Jedna migracja = jeden logiczny krok schematu (nowa tabela, zestaw kolumn, repair). Nie łączyć niezwiązanych zmian w jednym pliku po fakcie |
| Repair | Poprawka schematu na środowisku z już wykonanymi migracjami → nowy plik z idempotentnym `up()` (sprawdzenie `hasTable` / `hasColumn` przed DDL) |
| Historia | Starsze pliki z sufiksem `120000` zostają w repo; **nowe** migracje — tylko timestamp z CLI |
| Ostatnia wersja (2026-07-06) | `Version20260706140400` — kolejne migracje muszą mieć numer **większy** (np. `generate` od 7 lipca 2026: `Version20260707…`) |

**Przykład poprawnego workflow:**

```bash
# 1. Zmiana encji w PHP
# 2. Wygeneruj migrację (w kontenerze, www-data)
docker compose exec -u www-data -T app php bin/console doctrine:migrations:diff
# 3. Sprawdź wygenerowany Version20260706143022.php (przykład)
# 4. Uruchom
make migrate
# 5. Uzupełnij chronologię w tym pliku (database.md)
```

#### Klucze obce w DDL

| Reguła | Opis |
|--------|------|
| Nazwa constraintu | `fk_{tabela}_{kolumna}` (np. `fk_settlement_period_user`) |
| Zakres | Obowiązkowe dla migracji od `Version20260607204500` w górę |
| Walidacja | `docker compose exec -T app composer check:migration-fk-names` |

## Uruchamianie migracji

Aplikacja działa w Dockerze — **nie uruchamiaj** `doctrine:migrations:migrate` na hoście (brak drivera PDO do MariaDB).

```bash
make migrate
# lub bezpośrednio (użytkownik www-data = procesy Apache w kontenerze app):
docker compose exec -u www-data -T app php bin/console doctrine:migrations:migrate --no-interaction
```

Tworzenie migracji po zmianie encji (w kontenerze, jako `www-data`):

```bash
docker compose exec -u www-data -T app php bin/console doctrine:migrations:diff
```

**Produkcja** (`scripts/deploy.sh`): migracje na serwerze, bez Dockera — `php bin/console doctrine:migrations:migrate --no-interaction --env=prod` (użytkownik deployu na hoście).

## Kopie zapasowe bazy (aplikacyjne)

Backup infrastruktury (pliki, konto hostingowe) — po stronie hostingu. SamFin oferuje warstwę aplikacyjną: eksport/import pełnej bazy (użytkownicy, transakcje, słowniki, reguły…).

| Środowisko | Narzędzia | UI |
|------------|-----------|-----|
| Dev (Docker) | `mariadb-client` w kontenerze `app` | Ustawienia → Kopie zapasowe |
| Prod (hosting) | `mysqldump` / `mysql` z PATH (`/usr/bin/`) | j.w. + CLI |

### Format

ZIP w `backend/var/backups/` zawiera `{Ymd_His}_{build}.sql` + `manifest.json` (wersja aplikacji, build, commit, `schemaVersion`, SHA-256 SQL).

### Import — walidacja

Import odrzucany gdy `version` lub `schemaVersion` z manifestu ≠ bieżąca aplikacja/baza. Override: potwierdzenie `PRZYWRÓĆ MIMO NIEZGODNOŚCI` lub CLI `--force`.

### Bezpieczeństwo restore

Import SQL nie jest transakcyjny (DDL commituje od razu). Przed każdym restore tworzona jest automatyczna kopia w `var/backups/pre-restore/` (ostatnie 3).

### CLI (awaryjnie, bez HTTP)

```bash
# Utwórz kopię
php bin/console app:database:backup --no-interaction --env=prod

# Przywróć (np. po nieudanym imporcie)
php bin/console app:database:restore var/backups/pre-restore/pre-restore_YYYYMMDD_HHMMSS.zip --env=prod
```

Opcje restore: `--force`, `--skip-pre-backup`, `--no-interaction`.

### Cron (opcjonalny, ręczna konfiguracja na hostingu)

```bash
0 3 * * * cd /home/.../samfin/backend && /usr/local/bin/php bin/console app:database:backup --no-interaction --env=prod
```

Deploy (`scripts/deploy.sh`) **nie** konfiguruje crona.

### Limity

- Upload HTTP restore: max 32 MB (`BACKUP_MAX_UPLOAD_MB`, `post_max_size`). Większe pliki → CLI.
- Retencja kopii: 30 dni (`BACKUP_RETENTION_DAYS`).

### Prod → dev

Dump z MySQL 8 może zawierać kolacje (`utf8mb4_0900_ai_ci`) nierozpoznawane przez MariaDB 11 — import może wymagać korekty lub tej samej wersji schematu na obu instancjach.
