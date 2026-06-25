# Baza danych SamFin

Silnik: **MariaDB 11** (dev, Docker), **MySQL** (prod, hosting). Charset `utf8mb4_unicode_ci`, silnik InnoDB. Migracje Doctrine muszą być kompatybilne z oboma silnikami.

ORM: Doctrine 3. Migracje w `backend/migrations/` (23 pliki, chronologicznie od `Version20260607125328`).

## Lista tabel

| Tabela | Encja PHP | Opis |
|--------|-----------|------|
| `app_user` | `User` | Użytkownicy |
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
| `classification_rule` | `ClassificationRule` | Reguły auto-klasyfikacji per podmiot |
| `transaction_template` | `TransactionTemplate` | Szablony klasyfikacji per użytkownik (wpływ/wydatek) |
| `settlement_config` | `SettlementConfig` | Konfiguracja rozliczenia wpłat (per `user_id`) |
| `settlement_ledger_entry` | `SettlementLedgerEntry` | Indeks ledger rozliczeń (1 wiersz = 1 `transaction_item`, running state) |

## Diagram relacji (FK)

```mermaid
erDiagram
    app_user {
        int id PK
        string email UK
        string api_token UK
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
        bool direction_expense
        bool direction_income
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

Konwencja nazw FK (migracja `Version20260607204500`): `fk_{tabela}_{kolumna}`.

## Indeksy istotne dla zapytań

**transactions:** `operation_date`, `status`, `direction`, `import_id`, `paid_from_party_id`, `paid_to_party_id`, unikalny `import_row_id`.

**transaction_items:** `transaction_id`, `wallet_id`, `concern_id`, `category_id`.

**transactions_change_log:** `transaction_id`, `created_at`.

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
| `20260623120000` | `category`: `direction_expense`, `direction_income` (zastępuje `type`) |
| `20260624120000` | Backfill `classification_rule.name` i `description` dla reguł z `created_from_transaction_id` |
| `20260625120000` | `common_account_settlement_config` — konfiguracja rozliczenia (historyczna nazwa) |
| `20260626120000` | Repair: utworzenie `common_account_settlement_config` jeśli brak (gdy `20260625120000` zapisana bez tabeli) |
| `20260627120000` | Rename: `settlement_config`, kolumna `settlement_party_id` |
| `20260628120000` | `settlement_ledger_entry`; kolumny indeksu na `settlement_config` (`reindex_from_date`, salda początkowe, `needs_refresh`, …) |

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

Brak kolumny `deleted_at`. Dezaktywacja przez `active = false` w: `party`, `party_bank_account`, `wallet`, `concern`, `category`, `app_user`.

## Seed danych

Jedyna migracja seedująca dane biznesowe: konto `admin@samfin.local`. Słowniki konfiguracyjne (kategorie, portfele itd.) **nie są seedowane** — użytkownik tworzy je przez UI/API.

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

Skrypt pomocniczy: `backend/bin/check-migration-fk-names.php`.

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
