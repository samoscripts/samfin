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

1. Pobiera wiersze ze statusem `VALIDATED` **partiami po 500** (`flush` + `clear` EntityManager po każdej partii).
2. Na start importu: jedno zapytanie o reguły klasyfikacji podmiotu (`PreparedClassificationRules`) i jedno o istniejące duplikaty w zakresie dat (`buildDuplicateLookup`).
3. Dla każdego wiersza sprawdza duplikat w lookupie O(1); po utworzeniu transakcji dopisuje fingerprint do lookupu (duplikaty wewnątrz tego samego pliku).
4. Tworzy `Transaction` + jedną `TransactionItem` (pełna kwota, bez portfela/obszaru/kategorii).
5. **Reguły klasyfikacji:** `ClassificationRuleEngine::applyToTransaction()` z wcześniej przygotowanym zestawem reguł (`overwrite: true`).
6. **Automatyczne Skąd/Dokąd:** podmiot z `csv_import.party` (ustawiony przy uploadzie z dopasowanego `party_bank_account`):
   - `direction = EXPENSE` (kwota ujemna) → `paid_from_party`
   - `direction = INCOME` (kwota ≥ 0) → `paid_to_party`
7. Status transakcji: `TransactionStatusCalculator::calculate()` — zwykle `PARTIALLY_CLASSIFIED` (jeden podmiot, brak wymiarów na pozycji).
8. Ustawia wierszowi status `IMPORTED` lub `DUPLICATE`.
9. Ustawia importowi status `IMPORTED`.

Całość w jednej transakcji DB (`wrapInTransaction`) — błąd w dowolnym momencie wycofuje cały attempt.

**Wymagania runtime:** `max_execution_time` ≥ 300 s (Docker: `docker/php/php.ini`; produkcja: `.htaccess` lub panel hostingu). Przy dużym imporcie historycznym w dev warto wyłączyć Xdebug.

Walidator podmiotów (`TransactionPartyAssignmentValidator`) **nie** jest wywoływany przy imporcie — zakłada się poprawną konfigurację podmiotu powiązanego z rachunkiem bankowym.

### Kryterium duplikatu

Ta sama kombinacja w ramach importów danego podmiotu:

- `party` (z importu)
- `trans_date` (data z wiersza CSV: `csv_import_row.operation_date`)
- `amount_minor`
- `counterparty_account_number`
- `canonical_text` — `trans_title` lub `trans_description` (pierwsza niepusta wartość, lowercase)

Zakres dat przy budowie lookupu duplikatów: `min(periodFrom, MIN(operation_date wierszy CSV))` … `max(periodTo, MAX(operation_date wierszy CSV))` — transakcje kart z `DATA TRANSAKCJI` w tytule (data wcześniejsza niż okres wyciągu) nadal trafiają do lookupu przy ponownym imporcie. W `transactions` odpowiada to polu `trans_date`.

## Architektura parsowania CSV

```
Plik CSV → BankImportProvider (np. MbankCsvImportProvider)
         → detekcja wariantu nagłówka
         → CsvFormatMapperInterface (per wersja formatu)
         → NormalizedImportRow (kanoniczny DTO)
         → csv_import_row (surowe + zmapowane pola)
         → Transaction (stabilne pola domenowe)
```

Nowe wersje eksportu banku dodaje się jako kolejny mapper — bez zmiany schematu `transactions`.

### Format mBank

Jedyny obsługiwany eksport: **elektroniczne zestawienie operacji** (`MBANK_ELECTRONIC_STATEMENT`).

| Kod | Eksport | Kolumny danych |
|-----|---------|----------------|
| `MBANK_ELECTRONIC_STATEMENT` | Elektroniczne zestawienie operacji | data księgowania, data operacji, opis operacji, tytuł, nadawca/odbiorca, NRB, kwota, saldo |

Mapowanie na `transactions`:

- `trans_date` — z `DATA TRANSAKCJI: YYYY-MM-DD` w tytule (karty), inaczej kolumna „Data operacji”
- `trans_title` — tytuł po oczyszczeniu (`MbankTitleParser::cleanTitle`): usunięcie wyłącznie sufiksu `DATA TRANSAKCJI: YYYY-MM-DD` (lub uciętego `DATA TRANSAKCJI:` bez daty); reszta tytułu bez zmian (w tym `/LOKALIZACJA`, `/SIERAKOWIC` itd.)
- `trans_description` — kolumna „Opis operacji” (`description_raw` w `csv_import_row`)
- `balance_after_minor` — saldo po operacji (tylko format elektroniczny)

W `csv_import_row`: `title_raw` (surowy), `title_clean` (po `cleanTitle`).

Typ operacji z banku (`operation_type_raw` w `csv_import_row`) jest zachowany wyłącznie w audycie importu — **nie** w `transactions`.

## Provider mBank (`MbankCsvImportProvider`)

- **Kod:** `MBANK`
- **Wyświetlana nazwa:** mBank S.A.
- **Tag Symfony:** `app.bank_import_provider`

### Kroki parsowania

1. **Kodowanie** — pliki mBank (Windows) są zwykle w **CP1250**; konwersja do UTF-8 przez `CsvEncodingNormalizer` (UTF-8 z BOM, CP1250, ISO-8859-2). Wykrywanie „fałszywego UTF-8” (bajty C1 / `U+0080–U+009F` po błędnym odczycie Ś, Ą itd.).
2. **Nagłówek metadanych** — markery `#Klient`, `#Za okres:`, `#dla rachunków:` lub `#Numer rachunku`, `#Waluta` itd.
3. **Detekcja wariantu** — `MbankCsvFormatMapperRegistry` wybiera mapper po nagłówku sekcji danych.
4. **Wiersze danych** — mapper mapuje kolumny na `NormalizedImportRow`; linie metadanych (`#…`), stopka prawna mBank (np. „Niniejszy dokument sporządzono… art. 7 Ustawy Prawo Bankowe”) i inne stopki po transakcjach kończą sekcję danych bez zapisu wiersza i bez błędu parsowania.
5. **Wynik** — `ImportResult` z `csvFormat`, metadanymi, wierszami i błędami.

Implementacja: `backend/src/Home/Import/Provider/MbankCsvImportProvider.php`, mapery w `backend/src/Home/Import/Mapper/Mbank/`.

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
| `ImportResult` | Wynik `parse()`: `csvFormat`, metadane, wiersze, błędy, `hasFatalErrors()` |
| `NormalizedImportRow` | Kanoniczny wiersz po mapowaniu wersji CSV |
| `ImportErrorData` | Błąd: `scope`, `code`, `message`, `lineNo`, `fatal` |
| `CsvFormatMapperInterface` | Kontrakt mappera wersji CSV → `NormalizedImportRow` |

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
