# Import CSV

SamFin importuje transakcje bankowe z plików CSV w procesie dwuetapowym: **upload i walidacja**, potem **ręczne uruchomienie importu** do tabeli `transactions`.

## Przepływ end-to-end

```mermaid
sequenceDiagram
    participant U as Użytkownik
    participant FE as Frontend
    participant API as CsvImportController
    participant SVC as CsvImportService
    participant PRV as MbankCsvImportProvider
    participant ING as TransactionIngestionService
    participant DB as Baza

    U->>FE: Upload CSV + wybór banku
    FE->>API: POST /api/csv-imports (multipart)
    API->>SVC: import(source, content, filename, user)
    SVC->>DB: Utwórz csv_import (PENDING)
    SVC->>PRV: parse(csvContent)
    PRV-->>SVC: ImportResult (wiersze, błędy, metadane)
    SVC->>SVC: validateAgainstDatabase (rachunek, właściciel)
    SVC->>DB: Zapisz wiersze, błędy, status VALIDATED/FAILED
    API-->>FE: Podsumowanie importu

    U->>FE: Uruchom import (przycisk)
    FE->>API: POST /api/csv-imports/{id}/import
    API->>ING: ingestFromImport(csvImport, user)
    ING->>DB: Dla każdego VALIDATED wiersza: Transaction + Item
    ING->>DB: DUPLICATE jeśli duplikat; status importu IMPORTED
```

## Endpointy API

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/api/csv-imports/providers` | Lista providerów (kod + nazwa) |
| GET | `/api/csv-imports` | Lista importów (filtry: `source`, `status`, paginacja) |
| POST | `/api/csv-imports` | Upload pliku |
| GET | `/api/csv-imports/{id}` | Szczegóły importu |
| GET | `/api/csv-imports/{id}/errors` | Błędy (`scope`: HEADER/ROW) |
| GET | `/api/csv-imports/{id}/rows` | Wiersze (`parseStatus`) |
| POST | `/api/csv-imports/{id}/import` | Utworzenie transakcji |
| DELETE | `/api/csv-imports/{id}` | Usunięcie (409 jeśli status IMPORTED) |

## Warstwa serwisowa

### CsvImportService

1. Tworzy rekord `csv_import` (status `PENDING`).
2. Pobiera provider po kodzie `source`.
3. Wywołuje `parse()` → `ImportResult`.
4. Waliduje nagłówek względem bazy (`validateAgainstDatabase`).
5. Zapisuje wiersze (`csv_import_row`) i błędy (`csv_import_error`).
6. Ustawia status: `FAILED` (błąd fatalny) lub `VALIDATED`.

### TransactionIngestionService

1. Pobiera wiersze ze statusem `VALIDATED`.
2. Dla każdego wiersza sprawdza duplikat (`TransactionRepository::findDuplicate`).
3. Tworzy `Transaction` + jedną `TransactionItem` (pełna kwota, bez portfela/obszaru/kategorii).
4. **Automatyczne Skąd/Dokąd:** podmiot z `csv_import.party` (ustawiony przy uploadzie z dopasowanego `party_bank_account`):
   - `direction = EXPENSE` (kwota ujemna) → `paid_from_party`
   - `direction = INCOME` (kwota ≥ 0) → `paid_to_party`
5. Status transakcji: `TransactionStatusCalculator::calculate()` — zwykle `PARTIALLY_CLASSIFIED` (jeden podmiot, brak wymiarów na pozycji).
6. Ustawia wierszowi status `IMPORTED` lub `DUPLICATE`.
7. Ustawia importowi status `IMPORTED`.

Walidator podmiotów (`TransactionPartyAssignmentValidator`) **nie** jest wywoływany przy imporcie — zakłada się poprawną konfigurację podmiotu powiązanego z rachunkiem bankowym.

### Kryterium duplikatu

Ta sama kombinacja w ramach importów danego podmiotu:

- `party` (z importu)
- `operation_date`
- `amount_minor`
- `description` (surowy opis z CSV)

## Provider mBank (`MbankCsvImportProvider`)

- **Kod:** `MBANK`
- **Wyświetlana nazwa:** mBank S.A.
- **Tag Symfony:** `app.bank_import_provider`

### Kroki parsowania

1. **Kodowanie** — detekcja UTF-8 / ISO-8859-2 / Windows-1252, konwersja do UTF-8.
2. **Nagłówek metadanych** — markery `#Klient`, `#Za okres:`, `#Za rachunek`, lista rachunków itd.
3. **Wiersze danych** — kolumny typu data operacji, opis, konto, kategoria banku, kwota.
4. **Wynik** — `ImportResult` z `detectedClientName`, `detectedAccountNumber`, `periodFrom/To`, tablicą wierszy i błędów.

Szczegóły formatu pliku są zaimplementowane w `backend/src/Home/Import/Provider/MbankCsvImportProvider.php` — parser jest specyficzny dla eksportu mBank.

## Walidacja biznesowa (po parsowaniu)

| Kod błędu | Scope | Fatal? | Warunek |
|-----------|-------|--------|---------|
| `ACCOUNT_NOT_FOUND` | HEADER | tak | Numer rachunku z CSV nie ma dopasowania w `party_bank_account` |
| `ACCOUNT_NO_PARTY` | HEADER | tak | Rachunek bez powiązanego podmiotu |
| `CLIENT_MISMATCH` | HEADER | tak | Nazwa klienta z CSV ≠ `owner_name_from_bank` (po normalizacji) |
| `OWNER_NAME_NOT_SET` | HEADER | nie | Brak właściciela w konfiguracji — pomija walidację klienta |
| `ENCODING_ERROR` | HEADER | nie | Problem z kodowaniem pliku |

Porównanie numerów rachunków: usunięcie znaków nienumerycznych, porównanie stringów cyfr.

## Statusy

### Import (`csv_import.status`)

| Status | Znaczenie |
|--------|-----------|
| PENDING | Utworzony, przetwarzanie w toku |
| VALIDATED | Gotowy do importu transakcji |
| FAILED | Błąd fatalny — import transakcji zablokowany |
| IMPORTED | Transakcje utworzone |

### Wiersz (`csv_import_row.parse_status`)

| Status | Znaczenie |
|--------|-----------|
| VALIDATED | Poprawnie sparsowany, gotowy do ingestii |
| PARSE_ERROR | Błąd parsowania wiersza |
| DUPLICATE | Pominięty — duplikat istniejącej transakcji |
| IMPORTED | Przekształcony w transakcję |

## DTO (warstwa importu)

| Klasa | Rola |
|-------|------|
| `ImportResult` | Wynik `parse()`: metadane, wiersze, błędy, `hasFatalErrors()` |
| `ImportRowData` | Pojedynczy wiersz: surowe pola + `amountMinor`, `parseStatus` |
| `ImportErrorData` | Błąd: `scope`, `code`, `message`, `lineNo`, `fatal` |

## Frontend

| Strona | Route | Funkcja |
|--------|-------|---------|
| ImportNowy | `/import/nowy` | Wybór providera + upload |
| ImportHistoria | `/import/historia` | Lista importów |
| ImportSzczegoly | `/import/historia/:id` | Nagłówek, trigger importu |
| ImportBledy | `.../bledy` | Tabela błędów |
| ImportWiersze | `.../wiersze` | Tabela wierszy |

API client: `frontend/src/shared/api/csvImports.ts`.

## Wymagania wstępne (konfiguracja)

Przed importem użytkownik musi:

1. Utworzyć **podmiot** (party).
2. Dodać **rachunek bankowy** z numerem zgodnym z wyciągiem.
3. Opcjonalnie uzupełnić **owner_name_from_bank** dla walidacji nazwy klienta.

Bez dopasowanego rachunku import otrzyma status `FAILED` z kodem `ACCOUNT_NOT_FOUND`.

## Rozszerzanie o nowe banki

1. Utworzyć klasę implementującą `BankImportProviderInterface`.
2. Dodać atrybut `#[AutoconfigureTag('app.bank_import_provider')]`.
3. Zaimplementować `getCode()`, `getDisplayName()`, `parse(string $csvContent): ImportResult`.

Provider pojawi się automatycznie w `GET /api/csv-imports/providers`.
