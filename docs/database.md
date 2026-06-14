# Baza danych SamFin

Silnik: **MariaDB 11**, charset `utf8mb4_unicode_ci`, silnik InnoDB.

ORM: Doctrine 3. Migracje w `backend/migrations/` (14 plików, chronologicznie od `Version20260607125328`).

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
| `20260614150000` | `classification_rule`; `transactions.counterparty_account_number` |

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

```bash
make migrate
# lub
docker compose exec app php bin/console doctrine:migrations:migrate --no-interaction
```

Skrypt pomocniczy: `backend/bin/check-migration-fk-names.php`.
