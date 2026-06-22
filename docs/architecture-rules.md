# Reguły architektury i konwencje kodu

Preskryptywne zasady **jak piszemy kod** — do code review, refaktorów i pracy z agentami AI.

Powiązane dokumenty:
- [`decisions.md`](decisions.md) — ADR: *dlaczego* podjęliśmy decyzję (kontekst, historia, konsekwencje)
- [`modules.md`](modules.md) — mapa modułów i endpointów
- [`domain-model.md`](domain-model.md) — encje i relacje

---

## Legenda statusów

| Status | Znaczenie |
|--------|-----------|
| **ZAIMPLEMENTOWANE** | Reguła jest stosowana w kodzie; nowy kod musi ją respektować |
| **CZĘŚCIOWO** | Część kodu spełnia regułę; istniejące wyjątki do stopniowej migracji |
| **CEL** | Docelowa zasada; nie wymuszana w całym kodzie — nowy kod powinien iść w tym kierunku |

---

## Warstwy backendu (Symfony)

### Controllers never use repositories directly

**Status:** CZĘŚCIOWO

Kontroler odpowiada za HTTP: routing, autoryzację, deserializację żądania, wywołanie serwisu, odpowiedź JSON. **Nie** zawiera logiki biznesowej ani zapytań domenowych.

**Docelowo:** kontroler wstrzykuje wyłącznie serwisy (ew. `Security`). Odczyt listy/szczegółów przez repozytorium przenosić do serwisu odczytu (np. `TransactionQueryService`).

**Wyjątki dziś (do migracji):** `TransactionController`, `CsvImportController`, `AuthController`, kontrolery Configuration (`PartyController`, `WalletController`, …) — wstrzykują repozytoria bezpośrednio.

**Wzorzec docelowy:**
```
Controller → Service → Repository / EntityManager
```

---

### Business logic belongs in Services

**Status:** ZAIMPLEMENTOWANE (moduł Transaction); CZĘŚCIOWO (Configuration, Identity)

Logika biznesowa, walidacja domenowa, orchestracja wielu encji — w klasach `*Service` pod `App\{Module}\Service\`.

**Przykłady:**
- `TransactionClassificationService` — klasyfikacja pozycji
- `TransactionBulkUpdateService` — masowa aktualizacja pól
- `TransactionIngestionService` — ingestia z CSV
- `TransactionMaintenanceService` — eksport i czyszczenie
- `CsvImportService` — parsowanie i walidacja importu

Kontrolery Configuration nadal mieszają walidację inline z persistencją — przy większych zmianach wydzielać serwisy.

---

### Repositories never contain business logic

**Status:** ZAIMPLEMENTOWANE

Repozytoria to warstwa dostępu do danych: zapytania, filtry, paginacja, agregaty SQL. Bez reguł domenowych (np. „czy transakcja jest sklasyfikowana”).

**Dozwolone:** `findPaged()`, `getStats()`, `findDuplicate()`, `countAll()`, `findBatchForExport()`.

**Niedozwolone:** ustawianie statusu transakcji, walidacja Skąd/Dokąd, zapis historii zmian.

**Pliki:** `backend/src/**/Repository/*.php`

---

## PHP i Symfony

### Prefer constructor injection

**Status:** ZAIMPLEMENTOWANE

Zależności wyłącznie przez konstruktor (`private readonly` / `private` promoted properties). Autowiring Symfony.

**Niedozwolone:** `$this->container->get()`, `ContainerAwareTrait`, ręczne `new` serwisów z zależnościami.

---

### No service locator

**Status:** ZAIMPLEMENTOWANE

Brak service locatora i globalnego dostępu do kontenera w kodzie aplikacji.

---

### No static helpers

**Status:** CEL

Unikać klas z samymi metodami `static` jako skrótu do logiki biznesowej. Dopuszczalne: fabryki testowe, proste parsery bez stanu (o ile nie duplikują walidacji domenowej).

Preferować wstrzykiwalne serwisy zamiast `SomeHelper::doThing()`.

---

### DTO are readonly

**Status:** ZAIMPLEMENTOWANE (Import); CZĘŚCIOWO (reszta API)

DTO (`final class`) z `public readonly` właściwościami i bez mutatorów. Metody pomocnicze tylko do odczytu (np. `hasErrors()`).

**Wzorzec:** `backend/src/Home/Import/DTO/ImportResult.php`, `ImportRowData.php`, `ImportErrorData.php`.

**Uwaga:** ADR-010 stanowi, że większość API **nie używa** DTO — walidacja inline w kontrolerach. Nowe DTO wprowadzać tam, gdzie przepływ jest złożony (import, przyszłe tworzenie transakcji ręcznych). Gdy DTO — zawsze readonly.

---

### Value Objects are immutable

**Status:** CEL

Obiekty wartości (`final readonly class`) dla pojęć domenowych bez tożsamości (np. `Money`, `DateRange`). Brak setterów; nowa wartość = nowy obiekt.

Dziś kwoty i daty są rozproszone (`amount_minor` na encji, konwersja w `toApiArray()`). VO to kierunek refaktoru, nie wymóg przy każdej zmianie.

---

### Prefer enums over strings

**Status:** CZĘŚCIOWO

**Dziś:** stałe stringowe na encjach (`Transaction::DIRECTION_INCOME`, `CsvImport::STATUS_IMPORTED`).

**Cel:** backed enums PHP 8.1+ dla statusów i kierunków w nowym kodzie; migracja istniejących stałych stopniowo (wymaga migracji DB / mapowania Doctrine).

Do czasu migracji — używać stałych z encji, **nie** magic strings w serwisach.

---

### UUID v7 everywhere

**Status:** CEL (konflikt ze stanem bieżącym)

**Dziś:** klucze główne `INT AUTO_INCREMENT` we wszystkich tabelach ([`database.md`](database.md)).

**Cel:** identyfikatory publiczne jako UUID v7 (sortowalność czasowa, bezpieczeństwo enumeracji). Wymagałoby migracji schematu i API — **nie** stosować ad hoc w nowych encjach bez ADR.

---

## Walidacja i single source of truth

### Never duplicate business validation

**Status:** ZAIMPLEMENTOWANE (Transaction); CZĘŚCIOWO (reszta)

Reguła biznesowa ma **jedno** miejsce implementacji. Frontend może powtarzać walidację UX (szybka informacja zwrotna), ale backend jest źródłem prawdy.

**Niedozwolone:** kopiowanie reguł statusu klasyfikacji, Skąd/Dokąd lub sumy pozycji w kontrolerze, jeśli istnieje już serwis/walidator.

---

## Moduł Transaction — wyłączne punkty odpowiedzialności

Poniższe reguły są **ZAIMPLEMENTOWANE**. Każda zmiana w tych obszarach musi przechodzić przez wskazane klasy.

### Transaction status is always calculated by `TransactionStatusCalculator`

Status (`UNCLASSIFIED`, `PARTIALLY_CLASSIFIED`, `CLASSIFIED`) **nigdy** nie jest ustawiany ręcznie w kontrolerze ani repozytorium.

**Jedyna metoda:** `TransactionStatusCalculator::calculate(Transaction $tx): string`

**Używane przez:**
- `TransactionClassificationService`
- `TransactionBulkUpdateService`
- `TransactionIngestionService`

**Definicja statusów:** ADR-015 w [`decisions.md`](decisions.md).

**Plik:** `backend/src/Home/Transaction/Service/TransactionStatusCalculator.php`

---

### Party assignment is always validated by `TransactionPartyAssignmentValidator`

Reguły Skąd/Dokąd (kontekst CSV vs MANUAL, OWN+CASH, `paidFrom ≠ paidTo`) — **tylko** w tym walidatorze.

**Używane przez:**
- `TransactionClassificationService`
- `TransactionBulkUpdateService`

**Definicja reguł:** ADR-014, ADR-017 w [`decisions.md`](decisions.md).

**Plik:** `backend/src/Home/Transaction/Service/TransactionPartyAssignmentValidator.php`

---

### Transaction history is written only by `TransactionSnapshotLogService`

Zapis do `transactions_change_log` **wyłącznie** przez `TransactionSnapshotLogService::log()` po udanej zmianie klasyfikacji.

**Niedozwolone:** bezpośredni `persist` na `TransactionChangeLog` w kontrolerze lub innym serwisie.

**Odczyt i restore:** `TransactionSnapshotLogService` (historia, przywracanie snapshotu przez ponowną klasyfikację).

**Plik:** `backend/src/Home/Transaction/Service/TransactionSnapshotLogService.php`

**Uwaga:** ADR-P03 — bulk update powinien również logować snapshoty; do weryfikacji przy review.

---

## Frontend (skrót)

Szczegóły nawigacji i struktury folderów — ADR-012, ADR-020 w [`decisions.md`](decisions.md).

| Reguła | Status |
|--------|--------|
| Zakładki modułu → segment URL (`NavLink` + `Outlet`) | ZAIMPLEMENTOWANE |
| Foldery `domains/{area}/`, współdzielone `shared/` | ZAIMPLEMENTOWANE |
| API client w `shared/api/` — jeden plik na zasób | ZAIMPLEMENTOWANE |
| Walidacja formularzy UX + backend jako source of truth | ZAIMPLEMENTOWANE |
| Formularze CRUD w **page content** lub **sidebar**; modale tylko na confirmy | ZAIMPLEMENTOWANE |
| Query params jako źródło prawdy widoku (ADR-025) | ZAIMPLEMENTOWANE |
| Walidacja query params na backendzie → HTTP 422 | ZAIMPLEMENTOWANE (Transaction, Import, Reports) |

### Query params i URL (ADR-025)

| Reguła | Status |
|--------|--------|
| Filtry, sort, paginacja list — w `useSearchParams`, nie w `useState` | ZAIMPLEMENTOWANE |
| Skrót `month=YYYY-MM` dla zakresu dat (transakcje, dashboard, stats API) | ZAIMPLEMENTOWANE |
| Paginacja: parametr `perPage` (`limit` — przestarzały alias w API importu) | ZAIMPLEMENTOWANE |
| Odpowiedź list importu: `{ data, meta: { total, page, perPage, lastPage } }` | ZAIMPLEMENTOWANE |
| Nieprawidłowe query → `422` z `{ message, errors: { pole: opis } }` | ZAIMPLEMENTOWANE |
| DTO query: `final readonly`, parsowanie w `fromInputBag()` | ZAIMPLEMENTOWANE |

**Pliki wzorcowe:** `Shared/DTO/QueryParams.php`, `TransactionListQuery.php`, `CsvImportListQuery.php`, `useTransactionListUrl.ts`, `dashboardUrlParams.ts`.

### Umiejscowienie UI (formularze vs modale)

| Typ interakcji | Gdzie | Przykłady |
|----------------|-------|-----------|
| Formularz create/edit (CRUD) | **Page content** lub **sidebar** | Podmioty, Kategorie, Reguły klasyfikacji; edycja/tworzenie transakcji w panelu bocznym listy (`?tab=edit`, `?tab=create`); edycja bulk w panelu bocznym |
| Potwierdzenie akcji destrukcyjnej | **Modal** (`ConfirmDialog`) | Usuń regułę, podmiot |
| Krótki prompt kontekstowy (1–2 pola) | Modal dopuszczalny | Zastosuj reguły klasyfikacji (checkbox overwrite) |
| Główne zakładki modułu | **URL** (`NavLink` + `Outlet`) | ADR-020 |

Przy nowej funkcji UI — **zapytać**: page, sidebar czy modal (confirm). Nie zakładać modala dla pełnych formularzy bez uzgodnienia.

Docelowy osobny dokument: `frontend-conventions.md` (opcjonalnie).

---

## Checklist przy PR (backend)

- [ ] Kontroler nie zawiera nowej logiki biznesowej
- [ ] Status transakcji przez `TransactionStatusCalculator`
- [ ] Skąd/Dokąd przez `TransactionPartyAssignmentValidator`
- [ ] Historia przez `TransactionSnapshotLogService::log()`
- [ ] Repozytorium bez reguł domenowych
- [ ] Zależności przez konstruktor
- [ ] Brak zduplikowanej walidacji już istniejącej w serwisie
- [ ] Nowe DTO — `final`, `readonly` properties
- [ ] GET z query params — DTO `fromInputBag()` + `QueryValidationErrors` → 422

---

## Checklist przy PR (frontend)

- [ ] Nowa zakładka modułu ma segment w `routes.tsx`
- [ ] Nawigacja przez `NavLink`, nie `useState` dla głównych tabów
- [ ] Wywołania API w `shared/api/`
- [ ] Formularze CRUD w content/sidebar — nie w modalu (modale: confirmy)
- [ ] Filtry/sort/paginacja synchronizowane z URL (`useSearchParams`)
- [ ] Nowe endpointy GET z query — DTO + walidacja 422 przy błędnych parametrach
- [ ] Paginacja API: `perPage` (nie `limit`)
