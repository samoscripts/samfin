# Decyzje architektoniczne i techniczne

Rejestr decyzji **wynikających z kodu** (odzwierciedlone w implementacji) oraz propozycji **DO POTWIERDZENIA**.

Powiązane: [`architecture-rules.md`](architecture-rules.md) — preskryptywne reguły warstw i konwencje kodu (jak piszemy, nie dlaczego).

Format: status `PRZYJĘTE` = widać w kodzie; `DO POTWIERDZENIA` = sugerowane, nie zaimplementowane.

---

## PRZYJĘTE

### ADR-001: Monorepo backend + frontend

**Kontekst:** Jeden repozytorium z `backend/` (Symfony) i `frontend/` (React).

**Decyzja:** Wspólny Docker Compose; frontend dev buduje do `backend/public/app/` w produkcji.

**Konsekwencje:** API pod `/api`, SPA pod `/app/` (Vite `base`).

---

### ADR-002: Autentykacja tokenem Bearer (stateless)

**Kontekst:** API bez sesji PHP.

**Decyzja:** Po logowaniu nowy wiersz w `user_api_token` (64 hex) w nagłówku `Authorization: Bearer`. Firewall `stateless: true`. Każde logowanie tworzy osobny token (`clientName`, np. `web` / `mobile`); wylogowanie unieważnia tylko bieżący token.

**Pliki:** `ApiTokenAuthenticator.php`, `ApiTokenService.php`, `UserApiToken.php`, `security.yaml`.

**Historia:** do 2026-06 token był w `app_user.api_token` (jeden na użytkownika) — migracja `Version20260627120000`.

---

### ADR-003: Kwoty jako integer (minor units)

**Kontekst:** Uniknięcie błędów float w finansach.

**Decyzja:** Kolumna `amount_minor INT`; API konwertuje na decimal przy odczycie.

---

### ADR-004: Soft delete przez `active`

**Kontekst:** Zachowanie integralności FK przy „usuwaniu” słowników.

**Decyzja:** Endpoint `DELETE` ustawia `active = false` na encjach konfiguracyjnych i użytkownikach.

---

### ADR-005: Import CSV dwuetapowy

**Kontekst:** Walidacja przed zapisem transakcji.

**Decyzja:**
1. `POST /csv-imports` — parsowanie + status VALIDATED/FAILED
2. `POST /csv-imports/{id}/import` — ingestia do `transactions`

Użytkownik przegląda błędy i wiersze przed commitem.

---

### ADR-006: Provider pattern dla banków

**Kontekst:** Różne formaty CSV.

**Decyzja:** `BankImportProviderInterface` + rejestr tagów Symfony. Jeden provider: mBank.

---

### ADR-007: Transakcja + pozycje (split)

**Kontekst:** Jedna operacja bankowa może być rozbita na wiele wymiarów budżetowych.

**Decyzja:** `Transaction` 1—* `TransactionItem` (max 5); suma pozycji = kwota transakcji.

---

### ADR-008: Klasyfikacja na trzech wymiarach słownikowych

**Kontekst:** Wymiary budżetu domowego.

**Decyzja:** Każda pozycja może mieć opcjonalnie `wallet`, `concern`, `category` (FK do tabel konfiguracyjnych).

---

### ADR-009: Snapshot historii jako JSON

**Kontekst:** Audyt zmian klasyfikacji.

**Decyzja:** Tabela `transactions_change_log` z kolumną `snapshot_json`; restore przez ponowne wywołanie `classifyTransaction`.

**Uwaga:** Snapshot zapisywany po zmianie, nie przed.

---

### ADR-010: Brak warstwy Form/DTO w API

**Kontekst:** Proste API JSON.

**Decyzja:** Walidacja inline w kontrolerach; wyjątek DTO tylko w module Import.

---

### ADR-011: Domena „Home” jako agregat finansowy

**Kontekst:** Organizacja kodu Symfony.

**Decyzja:** Podział na `Configuration`, `Import`, `Transaction` wewnątrz `App\Home\`.

---

### ADR-012: Frontend domain-driven folders

**Kontekst:** Skalowalność UI.

**Decyzja:** `domains/home`, `domains/settings`, współdzielone `shared/`, `layout/`.

---

### ADR-013: ~~Flagi kierunku podmiotu zamiast `usage_type`~~

**Status:** Superseded przez ADR-017 (2026-06-13). Flagi `direction_usage_*` usunięte z modelu.

---

### ADR-014: Twarda walidacja Skąd/Dokąd przy zapisie

**Kontekst:** Użytkownik nie powinien móc zapisać niedozwolonego podmiotu w polu Skąd lub Dokąd.

**Decyzja:** `TransactionPartyAssignmentValidator` wywoływany w `TransactionClassificationService` i `TransactionBulkUpdateService`. Błąd `InvalidArgumentException` → HTTP 400.

**Pliki:** `TransactionPartyAssignmentValidator.php`.

---

### ADR-015: Status klasyfikacji — pięć pól

**Kontekst:** Niejasna definicja `CLASSIFIED` (wystarczyło jednego wymiaru na pozycji).

**Decyzja:** Wspólna logika w `TransactionStatusCalculator`:
- `CLASSIFIED` = oba podmioty + na każdej pozycji portfel **i** dotyczy **i** kategoria
- `UNCLASSIFIED` = żadne pole nie wypełnione
- `PARTIALLY_CLASSIFIED` = pomiędzy

**Pliki:** `TransactionStatusCalculator.php`, używany przez klasyfikację, bulk update i import CSV.

---

### ADR-016: Automatyczne Skąd/Dokąd przy imporcie CSV

**Kontekst:** Przyspieszenie klasyfikacji po imporcie wyciągu bankowego.

**Decyzja:** `TransactionIngestionService` ustawia podmiot z `csv_import.party` (dopasowany rachunek przy uploadzie): EXPENSE → `paid_from`, INCOME → `paid_to`. Status z `TransactionStatusCalculator`. Brak osobnej kolumny w CSV.

**Pliki:** `TransactionIngestionService.php`, `CsvImportService.php` (ustawienie party przy walidacji rachunku).

---

### ADR-017: Reguły kontekstowe Skąd/Dokąd (bez `direction_usage_*`)

**Kontekst:** Flagi `direction_usage_income/expense` na podmiocie były przekombinowane; reguły wynikają z kontekstu transakcji.

**Decyzja:** Usunięcie flag z `party`. Walidacja i listy w UI oparte na `source`, `direction`, `type`, `ownershipType`:

| Kontekst | Skąd | Dokąd |
|----------|------|-------|
| Import + wydatek | OWN+ACCOUNT (read-only) | długa lista aktywnych podmiotów |
| Import + wpływ | długa lista | OWN+ACCOUNT (read-only) |
| Ręcznie + wydatek | tylko OWN+CASH | długa lista |
| Ręcznie + wpływ | długa lista | tylko OWN+CASH |

Globalnie: **Skąd ≠ Dokąd** (UI wyklucza drugie pole; backend `assertDistinctParties`).

**Pliki:** `TransactionPartyAssignmentValidator.php`, `partyAssignment.ts`, migracja `Version20260613140000`.

---

### ADR-018: Semantyka portfela (`wallet`)

**Kontekst:** W UI i rozmowie domenowej „portfel” mógł być mylony z rachunkiem bankowym (podmiot ACCOUNT) lub z limitem budżetowym.

**Decyzja:** `wallet` to **kubełek rozliczeniowy** — wymiar klasyfikacji pozycji transakcji (np. budżet domowy, salon fryzjerski, firma SamSoft). Użytkownik definiuje nazwy w słowniku; brak kwot docelowych, okresów ani powiązania z numerem rachunku.

**Konsekwencje:**
- Rachunek bankowy = `Party` + `PartyBankAccount`, używany przy imporcie CSV.
- Portfel = opcjonalne pole na `TransactionItem`, wymagane dopiero przy statusie `CLASSIFIED`.
- Copy UI: `Wallets.tsx` — „Kontekst rozliczeniowy transakcji…”.

**Pliki:** encja `Wallet`, `Wallets.tsx`, `configuration-dictionaries.md`.

---

### ADR-019: Transakcje ręczne — specyfikacja MVP

**Kontekst:** Stała `Transaction::SOURCE_MANUAL` istnieje; walidator obsługuje reguły Skąd/Dokąd dla źródła MANUAL.

**Decyzja (produktowa, do implementacji):**

| Pole | Wymagane |
|------|----------|
| `direction` | tak (INCOME / EXPENSE) |
| `operation_date` | tak (`trans_date` w API) |
| `amount` | tak |
| `trans_description` | tak (w API; dawniej `description`) |
| Skąd / Dokąd | opcjonalne przy tworzeniu; reguły jak ADR-017 (OWN+CASH po stronie własnej) |
| Pozycje (portfel, dotyczy, kategoria) | opcjonalne; status liczy `TransactionStatusCalculator` |

**Przepływ:** Formularz „Nowa transakcja” (`/app/transactions/new`) → `POST /api/transactions` ze `source: MANUAL` → jedna domyślna pozycja (jak import) → dalsza klasyfikacja przez istniejące `PUT /{id}/items`.

**Stan implementacji:** **ZAIMPLEMENTOWANE** — `TransactionCreateService`, `POST /api/transactions`, strona `TransactionNew.tsx` z prefill z query params (`direction`, `transDate`, `amount`, `transDescription`, `paidFromPartyId`, `paidToPartyId`, `walletId`, `concernId`, `categoryId`).

**Pliki:** `TransactionCreateService.php`, `TransactionController::create()`, `TransactionCreateForm.tsx`, `TransactionNew.tsx`, `transactionNewUrlParams.ts`.

---

### ADR-020: Zakładki nawigowane przez URL (React Router)

**Kontekst:** Zakładki sterowane wyłącznie stanem lokalnym (`useState`) nie odzwierciedlają aktualnego widoku w adresie — brak deep linków, odświeżenie strony wraca do domyślnej zakładki, niedziałające zakładki wstecz/dalej w przeglądarce.

**Decyzja:** Każda zakładka (tab) na poziomie modułu ma własny segment ścieżki w React Router. Nawigacja przez `NavLink` + `<Outlet />` w layoucie rodzica; `index` przekierowuje na domyślną zakładkę.

**Wzorce URL (prefix SPA: `/app`):**

| Moduł | Layout | Przykłady |
|-------|--------|-----------|
| Konfiguracja | `ConfigurationLayout` + `GeneralLayout` (zakładki Ogólne) | `/app/konfiguracja/ogolne/podmioty`, `/app/konfiguracja/reguly`, `/app/konfiguracja/dashboard` |
| Import CSV | `ImportLayout` | `/app/import/nowy`, `/app/import/historia` |
| Ustawienia | `Settings` | `/app/ustawienia/uzytkownicy`, `/app/ustawienia/system` |

**Zasada:** Nowe moduły z zakładkami stosują ten sam wzorzec — bez wyjątków. Zakładki wewnętrzne (np. panel boczny transakcji) mogą pozostać w stanie lokalnym, jeśli nie są główną nawigacją modułu.

**Pliki:** `routes.tsx`, layouty z `<Outlet />` (`ConfigurationLayout.tsx`, `GeneralLayout.tsx`, `ImportLayout.tsx`, `Settings.tsx`).

---

### ADR-021: Reguły klasyfikacji per `party_id`

**Kontekst:** Użytkownik chce automatycznie klasyfikować transakcje (jak filtry w Gmail), z osobnym zestawem reguł na każdy podmiot-rachunek (OWN+ACCOUNT).

**Decyzja:** Tabela `classification_rule` z FK `party_id`. Warunki i akcje w JSON (`conditions_json`, `actions_json`). `party_id` można zmienić (przeniesienie reguły). Pole `created_from_transaction_id` (nullable) — informacja o proweniencji, bez wpływu na logikę.

**Konsekwencje:** API CRUD pod `/api/parties/{partyId}/classification-rules`; lista globalna `GET /api/classification-rules`. Wykonanie reguł używa party z kontekstu własnej strony transakcji.

---

### ADR-022: Reguły nie nadpisują przy automacie (`fill_empty`)

**Kontekst:** Import CSV i domyślny run ręczny nie powinny nadpisywać ręcznej klasyfikacji.

**Decyzja:** Przy imporcie i run ręcznym z `overwrite=false` applier uzupełnia tylko puste pola. Nadpisanie wymaga jawnego `overwrite=true`.

---

### ADR-023: Reguły wyłącznie przez `TransactionClassificationService`

**Kontekst:** Ryzyko rozjazdu walidacji i historii przy osobnej ścieżce zapisu.

**Decyzja:** `ClassificationRuleApplier` buduje payload jak `PUT /transactions/{id}/items` i wywołuje `classifyTransaction()`. Zakaz bezpośredniej mutacji encji i własnego `flush()` poza tą ścieżką. Przechodzą ADR-009, ADR-015, ADR-017.

**Pliki:** `ClassificationRuleApplier`, `TransactionClassificationService`.

---

### ADR-024: Pozycje reguły — wyłącznie `percent` (suma = 100)

**Kontekst:** Wcześniejszy model `split: { type: FULL | PERCENT | REMAINDER }` był zbędnie złożony; UI i logika i tak operują na procentach.

**Decyzja:** Każda pozycja w `actions.items` ma pole `percent` (int, 1–100). Suma procentów wszystkich pozycji musi wynosić 100 (jedna pozycja → zawsze 100). Stary format `split` nie jest wspierany.

**Konsekwencje:** Przy apply kwoty liczone algorytmem „ostatnia pozycja = reszta w groszach” (jak przy edycji transakcji). Walidacja w `ClassificationRuleDefinitionValidator` i przy zapisie formularza (`validatePercents`).

---

### ADR-025: Query params jako źródło prawdy widoku listy

**Kontekst:** API odczytów używa GET + query params, ale stan filtrów, sortowania i paginacji w przeglądarce był trzymany w `useState` i `location.state` — brak deep linków, zakładek i historii przeglądarki.

**Decyzja:**

- Filtry, sort, paginacja i kontekst panelu (np. `tx`, `tab`) synchronizujemy z adresem URL przez `useSearchParams`.
- Path segmenty (ADR-020) dla tożsamości zasobu i trybu (`/transactions/:id/edit`, zakładki modułu).
- Wartości słownikowe w URL po **ID numerycznym** (`walletId=3`), zgodnie z API.
- Wielowartościowe filtry: format przecinkowy (`direction=EXPENSE,INCOME`).
- Opcjonalny skrót `month=YYYY-MM` w URL UI (rozwijany do `dateFrom`/`dateTo`).
- GET nie mutuje danych; zapis pozostaje POST/PUT/DELETE.
- Wspólne DTO filtrów na backendzie (`TransactionFilterCriteria`, `TransactionListQuery`).

**Konsekwencje:** `location.state` zastępowane query params tam, gdzie stan ma być trwały (powrót z edycji, reguła z transakcji). Złożone raporty w przyszłości mogą użyć `viewId` zamiast bardzo długiego URL.

**Pliki:** `useCrudRoute.ts`, `useTransactionListUrl.ts`, `transactionUrlParams.ts`, `TransactionListQuery.php`, trasy CRUD w `routes.tsx`.

---

## DO POTWIERDZENIA

### ADR-P01: Ujednolicenie nazewnictwa Flow → Transaction

**Propozycja:** Zmiana typów frontendowych `FlowItem` → `TransactionItem` itd.

**Powód:** Spójność z API i backendem.

**Ryzyko:** Duży diff bez wartości biznesowej.

---

### ADR-P02: ~~Wspólna usługa `calculateStatus`~~

**Status:** Zrealizowane jako ADR-015 (`TransactionStatusCalculator`).

---

### ADR-P03: Historia zmian dla bulk update

**Propozycja:** `TransactionBulkUpdateService` powinien logować snapshoty.

**Powód:** Użytkownik może oczekiwać pełnej historii edycji.

**Stan:** Obecnie tylko klasyfikacja pojedyncza loguje historię.

---

### ADR-P04: Symfony Validator + Request DTO

**Propozycja:** Zastąpić `json_decode` + ręczne if-y klasami request z atrybutami `Assert\*`.

**Powód:** Spójna walidacja, mniej boilerplate w kontrolerach.

---

### ADR-P05: Moduł raportów jako agregaty SQL

**Status:** Przyjęte (2026-07-07) — Rozbicie i Trend.

**Decyzja:** Endpointy `GET /api/reports/breakdown` i `GET /api/reports/trend` agregują **pozycje** (`transaction_items` JOIN `transactions`) przez DBAL SQL z GROUP BY category/wallet/concern (Rozbicie) oraz kubełkami czasowymi + seriami (Trend). Kwoty na poziomie pozycji (`ABS(ti.amount_minor)`), inaczej niż Analizy/Dashboard (nagłówek transakcji).

**Ustalenia:**
- Okres jednym sposobem jak Analytics: `dateFrom`+`dateTo` albo `year`+`month` (backend normalizuje; oba naraz → 422).
- Status: uwzględniane pozycje `status IN ('CLASSIFIED','PARTIALLY_CLASSIFIED')` (UI nie ma filtra statusu).
- Kategoria główna: `COALESCE(category.parent_id, category.id)`; buckety „bez wartości” → `id:null` z etykietą („Bez kategorii/portfela/Dotyczy”).
- `unclassifiedAmount` = suma pozycji `ti.category_id IS NULL` w zakresie tego samego zbioru co grupy.
- Bez scope’u po userze — spójnie z Analizami i listą transakcji.
- `chartTop` (limit „Top N”) pozostaje po stronie FE.
- Wspólne filtry pozycji: `Home/Report/Shared/` (`ReportItemFilterCriteria`, `ReportItemQuery`).
- Drill-down transakcji: faza 1 = link do `/transakcje` (filtry item-level vs header-level mogą się różnić); faza 2 = `GET /api/transactions` z filtrami pozycji.

**Powód:** Dashboard stats operuje na nagłówku transakcji, niewystarczające dla typowych raportów domowych.

**Dokumentacja:** pełna spec w [`docs/reporting.md`](reporting.md).

---

### ADR-P06: ~~Automatyczne podmioty przy imporcie CSV~~

**Status:** Zrealizowane jako ADR-016.

---

### ADR-P09: Rozbicie — wiele kierunków (Wpływ + Wydatek)

**Status:** Przyjęte (2026-07-10) — backend + FE (Faza 1: multi-toggle, URL, zapis, KPI, tabela, drill-down).

**Decyzja:** `GET /api/reports/breakdown` przyjmuje `reportDirections` (CSV), analogicznie do `trendDirections` w Trendzie. Zachowana kompatybilność: `reportDirection` (pojedynczy) i brak parametru → jeden kierunek `EXPENSE`.

**Ustalenia:**
- Przy obu kierunkach agregacja pivot (`expenses` / `income` per grupa); sortowanie grup po obrocie (`expenses + income`).
- `share` i `shareIncome` liczone osobno względem sum wydatków i wpływów.
- Skalar `total` w odpowiedzi przy obu kierunkach = suma wydatków (`totals.expenses`).
- FE: multi-toggle w sidebarze, URL `reportDirections`, migracja zapisów `reportDirection` → `reportDirections`; nowe typy wykresów — Faza 4 planu.

**Powód:** Porównanie wpływów i wydatków w jednym okresie bez dwóch osobnych raportów.

---

### ADR-P07: Encja Budget z limitami

**Propozycja:** Rozdzielić `concern` (obszar) od `budget` (kwota + okres).

**Powód:** UI mówi o „budżetach”, schemat DB tego nie modeluje.

---

### ADR-P08: ~~API tworzenia transakcji ręcznych~~

**Status:** Zaimplementowane wg ADR-019 (`POST /api/transactions`, UI `/transactions/new`).

---

### ADR-025: Kategoria — wiele kierunków (`direction_expense` / `direction_income`)

**Status:** **Superseded** przez ADR-036 (2026-06-30).

**Kontekst:** Kategoria miała pojedyncze pole `type` (INCOME lub EXPENSE). Użytkownik potrzebuje kategorii wspólnych dla obu kierunków lub wyboru wielu kierunków.

**Decyzja (historyczna):**

- Zastąpienie `category.type` kolumnami boolean `direction_expense`, `direction_income` (CHECK: co najmniej jedna aktywna).
- API: `directions: string[]` zamiast `type`.
- Reguła drzewa: kierunki podkategorii ⊆ kierunki parenta.
- Walidacja przy klasyfikacji / bulk update / szablonach: `Category::supportsDirection($transactionDirection)`.

**Pliki:** `Category.php`, `CategoryController.php`, migracja `20260623120000`, `categoryOptions.ts`, `CategoryForm.tsx`.

---

### ADR-036: Kategoria bez kierunku (neutralna względem wpływu/wydatku)

**Kontekst:** Parametryzacja kierunku na kategorii (`direction_expense` / `direction_income`, API `directions[]`) komplikowała CRUD, drzewo, merge i pickery. Kierunek transakcji pozostaje na `transaction.direction`.

**Decyzja:**

- Usunięcie kolumn `direction_expense`, `direction_income` i constraintu `chk_category_direction` (migracja `20260706140200`, dawniej `08120000`).
- API kategorii bez pola `directions` — dowolna aktywna subkategoria przypisywalna do wpływu i wydatku.
- Usunięcie walidacji `supportsDirection` przy klasyfikacji, bulk update, szablonach i merge.
- **Zachowane:** `user_category_pick_event.direction` — kontekst frequent picks per kierunek transakcji, nie atrybut kategorii.

**Pliki:** `Category.php`, `CategoryController.php`, serwisy transakcji i merge, `categoryOptions.ts`, `CategoryForm.tsx`.

---

### ADR-026: Lista kategorii — drzewo, DnD, scalanie subkategorii

**Kontekst:** Płaska tabela kategorii była mało czytelna przy hierarchii parent → child. Użytkownik potrzebuje przenoszenia subkategorii między grupami i scalania duplikatów.

**Decyzja:**

- UI: accordion grup głównych z rozwijanymi subkategoriami (`CategoryTreeList`, `@dnd-kit/core`).
- Przenoszenie: drag child → drop na grupę lub panel boczny „Przenieś” (`?panel=move&id=`); API: `PUT` z `parentId`.
- Scalanie: tylko subkategoria → subkategoria; panel boczny (`?panel=merge&id=`); `POST /api/categories/merge`; `CategoryMergeService` aktualizuje `transaction_items`, `transaction_template`, `classification_rule.actions_json`.
- Create/edit: panel boczny (`?panel=create`, `?panel=edit&id=`); legacy `/kategorie/nowy` i `/kategorie/:id/edycja` → redirect na query params.
- Backend: parent musi być rootem; grupa z dziećmi nie może zostać subkategorią.

**Pliki:** `CategoryMergeService.php`, `CategoryUsageService.php`, `CategoryController.php`, `categories/components/CategoryTree*.tsx`, `CategoriesSidebar.tsx`.

---

### ADR-027: Blokada dezaktywacji kategorii przy potwierdzonych użyciach

**Kontekst:** `DELETE /api/categories/{id}` dezaktywował kategorię bez sprawdzenia powiązań, mimo że merge już przepina te same referencje. Można było też ustawić `active: false` przez `PUT`.

**Decyzja:**

- Blokuj dezaktywację (`DELETE` oraz przejście `active: true → false` w `PUT`), gdy kategoria jest używana w:
  - `transaction_items.category_id`
  - `transaction_template.category_id`
  - `classification_rule.actions_json.items[].categoryId`
- API zwraca `422` z `message` i `usage: { items, templates, rules, total }`.
- Merge subkategorii nadal przepina powiązania i dopiero potem dezaktywuje źródło (bez zmiany semantyki ADR-026).
- `transactions_change_log.snapshot_json` nie jest liczony ani modyfikowany przy blokadzie ani merge.

**Pliki:** `CategoryUsageService.php`, `CategoryRuleReferenceSupport.php`, `CategoryController.php`, `CategoryMergeService.php`.

---

### ADR-028: Kopie zapasowe bazy danych (aplikacyjne)

**Kontekst:** Potrzeba eksportu/importu pełnej bazy między instancjami (prod → dev), kopii na żądanie i przywracania. Backup infrastruktury pozostaje po stronie hostingu.

**Decyzja:**

- Zakres: tylko baza danych (nie snapshot kodu).
- Format: ZIP (`SQL` + `manifest.json`); `schemaVersion` = ostatnia migracja Doctrine — gate przy imporcie (nie sam `build`).
- UI: Ustawienia → Kopie zapasowe (`ROLE_ADMIN`); API `/api/system/backups/*`.
- CLI: `app:database:backup`, `app:database:restore` (fallback awaryjny bez tokena HTTP).
- Przed restore: automatyczny pre-backup w `var/backups/pre-restore/` (max 3).
- Kompatybilność: dev MariaDB 11, prod MySQL; `mysqldump`/`mysql`; hasło DB przez `--defaults-extra-file`, nie argv.
- `symfony/process` w `require` (prod `--no-dev`).
- `symfony/mime` w `require` lub download przez `StreamedResponse` (nie `BinaryFileResponse` bez mime).

**Pliki:** `DatabaseBackupService.php`, `DatabaseBackupController.php`, `DatabaseBackupCommand.php`, `DatabaseRestoreCommand.php`, `frontend/.../backups/`.

---

### ADR-029: Synchroniczna ingestia CSV z batchowaniem

**Kontekst:** Duży jednorazowy import historyczny przekraczał `max_execution_time = 60` przez N+1 zapytań i jeden ogromny `flush()` w Doctrine UnitOfWork.

**Decyzja:** Pozostajemy przy synchronicznym `POST /csv-imports/{id}/import` (bez Messengera). Optymalizacja w `TransactionIngestionService`:
- partia 500 wierszy + `flush`/`clear`,
- `PreparedClassificationRules` — reguły klasyfikacji ładowane raz na import,
- `buildDuplicateLookup` — duplikaty pobierane jednym zapytaniem, lookup w pamięci aktualizowany po każdej nowej transakcji,
- `max_execution_time = 300` w Dockerze i `.htaccess`.

**Konsekwencje:** Brak workera/crona/pollingu. Rollback all-or-nothing przez `wrapInTransaction`. Async (Messenger) rozważyć tylko gdy import nadal przekracza limit po optymalizacji.

**Pliki:** `TransactionIngestionService.php`, `TransactionRepository.php`, `ClassificationRuleEngine.php`, `docker/php/php.ini`, `backend/public/.htaccess`.

---

### ADR-030: Usuwanie transakcji — kosz (`transactions_trash`) + hard DELETE

**Kontekst:** Użytkownik potrzebuje usuwać pojedyncze transakcje z potwierdzeniem. Usunięte wpisy nie mogą wpływać na statystyki, listy, reguły ani raporty.

**Decyzja:**

- Zamiast flagi `is_deleted` na `transactions`: przed usunięciem zapis pełnego snapshotu w `transactions_trash` (`snapshot_json` zawiera dane transakcji, pozycje, historię klasyfikacji, metadane importu).
- Następnie hard `DELETE` z `transactions` (CASCADE: `transaction_items`, `transactions_change_log`; `classification_rule.created_from_transaction_id` → SET NULL).
- API: `DELETE /api/transactions/{id}` → `204`.
- Po usunięciu: `SettlementIndexStateService::markDirty` (przebudowa ledgera rozliczeń).
- Reimport CSV (`ImportIngestionMode::Reimport`) używa tego samego `TransactionDeleteService` (bez wielokrotnego `markDirty` w pętli — raz na końcu importu).
- Widok kosza w UI — poza MVP; tabela przygotowana pod przyszły endpoint.

**Konsekwencje:** Zapytania operacyjne bez dodatkowego filtra „aktywnych” transakcji. Admin `clearAll` nadal kasuje wszystko bez snapshotu (osobna ścieżka).

**Pliki:** `TransactionDeleteService.php`, `TransactionTrash.php`, `TransactionController.php`, `TransactionIngestionService.php`, `TransactionDetailsPanel.tsx`.

---

### ADR-031: Wycofanie parsera legacy mBank (5 kolumn)

**Kontekst:** Pierwszy eksport mBank („lista operacji”, 5 kolumn, nagłówek `#Data operacji`) zastąpiony przez elektroniczne zestawienie operacji (8 kolumn, `#Data księgowania`). Nowe pliki 5-kolumnowe nie są importowane.

**Decyzja:** Usunięto `MbankOperationsListMapper` i `CounterpartyAccountExtractor`. Jedyny mapper: `MbankElectronicStatementMapper`. Kolumny audytu `bank_category_raw` / `own_account_label_raw` w `csv_import_row` pozostają w schemacie (nullable, niewypełniane).

**Pliki:** `Mapper/Mbank/`, `MbankCsvImportProvider.php`.

---

### ADR-032: App lock na Androidzie (PIN + biometria)

**Kontekst:** Aplikacja mobilna (Capacitor, remote WebView) przechowuje token API lokalnie. Wymagane zabezpieczenie przed dostępem po przejściu apki w tło.

**Decyzja:** Tylko na native (`isNativeApp()`):
- Token API w `@capacitor/preferences` (migracja z `localStorage`); w pamięci tylko po odblokowaniu.
- PIN 4–8 cyfr — hash SHA-256 + salt w Preferences (nie plaintext).
- Opcjonalnie odblokowanie biometryczne (`@capgo/capacitor-native-biometric`); biometria nie zastępuje PIN przy pierwszym uruchomieniu sesji po zimnym starcie — wymagany PIN lub hasło przy logowaniu.
- Blokada przy `appStateChange` (tło) po pierwszym odblokowaniu w sesji.
- Web (przeglądarka) — bez app lock, token nadal w `localStorage`.

**Pliki:** `frontend/src/mobile/` (`tokenStorage.ts`, `pinAuth.ts`, `AppLockScreen.tsx`), `AppLockProvider.tsx`, `AuthProvider.tsx`.

---

### ADR-033: Aplikacja mobilna Android (Capacitor, remote WebView)

**Kontekst:** Użytkownicy chcą importować CSV z mBanku bezpośrednio z telefonu („Otwórz za pomocą”) i mieć osobną sesję obok przeglądarki.

**Decyzja:**
- Monorepo: katalog `mobile/` (Capacitor 7 + projekt Gradle `android/`) obok `frontend/` i `backend/`.
- **Remote URL:** APK ładuje produkcyjny frontend (`https://fin.samsoft.pl/app/`) w WebView — bundle React **nie** jest pakowany w APK; zmiany UI wymagają deployu web (lub tymczasowego `server.url` na LAN w dev).
- **Workflow:** edycja kodu i `cap sync` w WSL; Android Studio / emulator / USB na Windows (`\\wsl.localhost\...`).
- **Intent CSV:** plugin `CsvIntent` (`ACTION_VIEW`) zapisuje plik w cache natywnym; JS odczytuje surowe bajty (base64) po odblokowaniu apki; nawigacja na `/import/nowy` bez auto-submit.
- **Multi-token:** wiele wierszy `user_api_token` na użytkownika (ADR-002); logout unieważnia tylko bieżący token z nagłówka `Authorization`.

**Konsekwencje:** Logika natywna za `isNativeApp()`; synchronizacja API pluginu JS ↔ kod Java przy każdej zmianie natywnej; test intentu CSV tylko na fizycznym telefonie.

**Pliki:** `mobile/`, `frontend/src/mobile/`, `UserApiToken.php`, `ApiTokenService.php`, `ImportNowy.tsx`.

---

### ADR-034: Publikacja APK i sprawdzanie aktualizacji (sideload)

**Kontekst:** Użytkownicy pobierają APK spoza sklepu; apka musi wiedzieć, czy jest nowsza wersja natywna, i czasem wymusić aktualizację.

**Decyzja:**
- Źródło wersji mobile: `mobile/version.json` (`versionName`, `versionCode`, opcjonalnie `minVersionCode`) → Gradle przez `-PappVersionCode` / `-PappVersionName`.
- Po `make mobile-build` skrypt pyta o kopiowanie do `backend/public/downloads/`; `make mobile-build-i` / flaga `-i` — bez pytania.
- Pliki: `samfin-{versionName}.apk`, `samfin.apk`, manifest `mobile.json` (publiczny, bez auth).
- `make deploy` wgrywa `backend/public/downloads/` razem z frontendem (bez osobnego skryptu).
- Frontend: strona `/o-aplikacji` (sekcja mobilna + pobieranie); baner instalacji na Androidzie w WWW; w apce natywnej — opcjonalny baner aktualizacji lub pełna blokada UI gdy `localVersionCode < minVersionCode`.
- Brak auto-instalacji (sideload) — użytkownik pobiera APK ręcznie. Zmiany React **nie** wymagają nowego APK (remote WebView, ADR-033).

**Pliki:** `mobile/version.json`, `mobile/scripts/build-apk.sh`, `scripts/deploy.sh`, `frontend/src/mobile/updateCheck.ts`, `MobileUpdateProvider.tsx`, `domains/about/pages/AboutApp.tsx`.

---

### ADR-035: Hard delete nieaktywnych kategorii

**Kontekst:** Nieaktywne kategorie (`active = false`) pozostawały w bazie bez możliwości usunięcia z UI. `DELETE /api/categories/{id}` na nieaktywnej kategorii zwracał idempotentny komunikat bez fizycznego usunięcia.

**Decyzja:**

- `DELETE /api/categories/{id}` dla **aktywnej** kategorii — bez zmian (dezaktywacja, ADR-027).
- `DELETE /api/categories/{id}` dla **nieaktywnej** kategorii — **hard DELETE** z tabeli `category`.
- Warunki hard delete:
  - brak użyć w `transaction_items`, `transaction_template`, regułach (`CategoryUsageService`, ten sam zakres co ADR-027) → `422` + `usage`;
  - brak subkategorii (`countChildren = 0`) → `422` z komunikatem o konieczności usunięcia dzieci.
- Brak snapshotu / kosza (w przeciwieństwie do ADR-030 dla transakcji).
- UI: sekcja „Nieaktywne” w `Categories.tsx` — przycisk kosza; potwierdzenie przez `ConfirmDialog` (dezaktywacja też przez `ConfirmDialog`).

**Pliki:** `CategoryController.php`, `CategoryInUseException.php`, `categories.ts`, `Categories.tsx`, `CategoryTreeRow.tsx`, `CategoryTreeGroup.tsx`.

---

### ADR-037: Rozliczenia — Model B rotacji (stan + anchor)

**Kontekst:** Model A (`base − rotation_carry + portfele`) nie odzwierciedlał reguły „dorównaj sumę wpłat drugiej osoby”. UI wymagało osobnych kafelków per osoba z kotwicą (anchor) i opisem formuły z backendu.

**Decyzja:**

- Zastąpić `SettlementBalanceEngine` klasą `SettlementRotationEngine`: Σ wpłat M/B, `stan`, anchor, sugerowana = dorównanie + portfel − prepaid.
- Anchor zmienia się **wyłącznie** przy wpłacie rotacyjnej; remis Σ → anchor przechodzi na drugą osobę względem poprzedniej kotwicy.
- API: `rotation.anchor`, `stanMaciek`/`stanBasia`, `personOutlook.isAnchor`, `catchUpAmount`, `formulaSummary` (tekst po polsku z `SettlementFormulaFormatter`).
- Ledger: kolumny `maciek_deposits_total_minor`, `basia_deposits_total_minor`; rename `next_depositor` → `anchor`; `rotation_carry_minor` deprecated (0).
- Migracja `Version20260706140400` (dawniej `10120000`): TRUNCATE ledger + `needs_refresh=1` — wymuszony rebuild po deploy.
- Frontend renderuje wyłącznie pola API (bez składania formuł w TS).

**Pliki:** `SettlementRotationEngine.php`, `SettlementOutlookBuilder.php`, `SettlementFormulaFormatter.php`, `SettlementIndexerService.php`, `SettlementService.php`, `SettlementReportLayout.tsx`, migracja `Version20260706140400`.

---

### ADR-038: Rozliczenia — roczne okresy rozliczeniowe ze snapshotem

**Kontekst:** Termin „indeks” w UI mylił użytkownika z formalnym okresem rozliczeniowym. Potrzebny był podział na lata kalendarzowe (1.01–31.12) z zamknięciem i przeniesieniem stanu otwarcia.

**Decyzja:**

- Tabela `settlement_period` per użytkownik: `year`, `date_from`/`date_to` (zawsze 01.01–31.12), `status` (`open`/`closed`), `closing_snapshot_json`, `closed_at`.
- API raportu: parametr `settlementYear` (domyślnie bieżący rok); konflikt z `year`+`month` lub `dateFrom`+`dateTo` → `422`.
- `GET /api/reports/settlements/periods` — lista okresów + `firstYear` (z `reindexFromDate`) i `currentYear`.
- Auto-zamknięcie po 31.12: replay silnika rotacji, snapshot (`SettlementRotationEngine::toSnapshot()`), carry do `opening*` w konfiguracji, `reindexFromDate` = 1.01 następnego roku, `needsRefresh=true`.
- Zamknięty okres: outlook ze snapshotu; odświeżanie zablokowane (`assertRefreshAllowed`).
- `reindexFromDate` — tylko techniczny start ewidencji; w UI termin **„okres rozliczeniowy”** (słownik `SETTLEMENT_UI_LABELS`).
- Frontend: przełącznik lat w URL `?settlementYear=`, zakładki raportu (Podsumowanie / szczegóły z lokalnym filtrem okresu).

**Pliki:** `SettlementPeriod.php`, `SettlementPeriodService.php`, `SettlementPeriodRepository.php`, `SettlementQuery.php`, `SettlementController.php`, `SettlementReportContext.tsx`, `SettlementPeriodSwitcher.tsx`, migracja `Version20260706133600`.

---

### ADR-039: Rozliczenia — wkłady własne (source_exp_deposit)

**Kontekst:** Gotówka i wydatki ze źródeł wpłat (np. Gotówka Basi, ESTETICA) na portfel Budżet domowy nie trafiały do raportu rozliczeń — zapytanie SQL wymagało Skąd/Dokąd = konto wspólne. Użytkownik odrzucił model kredytu z kieszeni (bez zmiany Σ) na rzecz traktowania wkładu jak wpłaty rotacyjnej.

**Decyzja:**

- Nowy typ faktu ledgera: `source_exp_deposit` — **wydatek** ze źródła wpłat (`maciekSourcePartyIds` / `basiaSourcePartyIds`) na portfel budżetu domowego, przy `paid_from ≠ settlementPartyId`; pole Dokąd nieistotne.
- Efekt w silniku: ten sam co `standard_deposit` (`applyStandardDeposit` → Σ + anchor).
- `SettlementItemQuery`: trzecia gałąź OR dla powyższej reguły (transakcje spoza konta wspólnego).
- API: osobne pole `sourceExpenseDeposits` (maciek/basia); `standardDeposits` = wyłącznie INCOME na konto rozliczenia.
- UI: zakładka **Wkłady własne** + podsumowanie na zakładce Podsumowanie.
- **Bez** modelu `out_of_pocket` / kredytu z kieszeni.
- Ręczne MANUAL + EXPENSE: Skąd musi być OWN+CASH (`TransactionPartyAssignmentValidator`) — gotówka działa od razu; inne typy podmiotów ze źródeł — follow-up.

**Pliki:** `SettlementItemQuery.php`, `SettlementItemClassifier.php`, `SettlementRotationEngine.php`, `SettlementService.php`, `SettlementIndexerService.php`, `SettlementOwnContributions.tsx`, `SettlementSummary.tsx`.

---

### ADR-040: Podmenu Konfiguracji i struktura katalogów = rozkład funkcjonalny

**Kontekst:** Moduł Konfiguracja urósł (słowniki, reguły, planowany dashboard). Płaski pasek zakładek i płaski katalog `configuration/parties`, `classification-rules` nie odzwierciedlały podziału funkcjonalnego. Raporty już stosują wzorzec: submenu w sidebarze + podkatalogi per raport (`reports/analytics`, `reports/breakdown`, …).

**Decyzja:**

- **Sidebar:** rozwijana grupa „Konfiguracja” z pozycjami: **Ogólne**, **Reguły**, **Dashboard** (jak `REPORTS_NAV`).
- **Ogólne:** poziome zakładki w treści (Podmioty, Portfele, Dotyczy, Kategorie); URL `/konfiguracja/ogolne/*`.
- **Reguły:** `/konfiguracja/reguly/*` (bez zmiany ścieżek API).
- **Dashboard:** placeholder `/konfiguracja/dashboard` (implementacja w osobnym zadaniu).
- **Katalogi FE** (angielskie nazwy folderów, polskie segmenty URL): `configuration/general/`, `configuration/rules/`, `configuration/dashboard/`.
- **Katalogi BE:** `Configuration/General/` (słowniki), `Configuration/Rules/` (przeniesione z `Transaction/ClassificationRule/`). Ścieżki API i schemat DB bez zmian.
- **Zasada:** nowe funkcje trafiają do podkatalogu odpowiadającego podmenu (np. Raporty nie lądują w `general/`). Zależności między modułami (np. `Rules → Transaction`) są dopuszczalne — lokalizacja odzwierciedla **menu użytkownika**, nie wyłącznie graf zależności technicznych.
- **Kompatybilność URL:** redirecty `/konfiguracja/podmioty` → `/konfiguracja/ogolne/podmioty` (i analogicznie portfele, dotyczy, kategorie).

**Pliki:** `Sidebar.tsx`, `SidebarNavGroup.tsx`, `ConfigurationLayout.tsx`, `GeneralLayout.tsx`, `routes.tsx`, `Home/Configuration/General/*`, `Home/Configuration/Rules/*`.

---

## Historia dokumentu

| Data | Zmiana |
|------|--------|
| 2026-06-13 | Utworzenie rejestru na podstawie analizy kodu |
| 2026-06-13 | ADR-017: usunięcie direction_usage_*; reguły kontekstowe Skąd/Dokąd |
| 2026-06-13 | ADR-018 (portfel), ADR-019 (transakcje ręczne MVP — plan) |
| 2026-06-14 | ADR-021..023: reguły klasyfikacji per party, fill_empty, classify service |
| 2026-06-23 | ADR-025: kategoria — `direction_expense` / `direction_income`, API `directions[]` (superseded ADR-036) |
| 2026-06-30 | ADR-036: usunięcie kierunku z kategorii — migracja `20260706140200` |
| 2026-07-06 | Przemianowanie migracji `07120000`–`10120000` → `06140100`–`06140400` (spójna kolejność na dev/prod) |
| 2026-06-24 | ADR-026: lista kategorii — drzewo, DnD przenoszenie, merge subkategorii |
| 2026-06-24 | ADR-027: blokada dezaktywacji kategorii przy użyciu w transakcjach, szablonach i regułach |
| 2026-06-24 | ADR-028: kopie zapasowe bazy (ZIP+manifest, CLI, pre-restore) |
| 2026-06-25 | ADR-029: synchroniczna ingestia CSV — batchowanie, cache reguł, bulk duplikaty |
| 2026-06-25 | ADR-030: usuwanie transakcji — kosz `transactions_trash` + hard DELETE |
| 2026-06-26 | ADR-031: wycofanie parsera legacy mBank CSV (5 kolumn) |
| 2026-06-27 | ADR-032: app lock mobile — PIN, biometria, token w Preferences |
| 2026-06-27 | ADR-033: aplikacja Android — Capacitor remote URL, intent CSV, workflow WSL+Windows |
| 2026-06-27 | ADR-034: publikacja APK (downloads/, mobile.json), aktualizacje i strona O aplikacji |
| 2026-06-30 | ADR-035: hard delete nieaktywnych kategorii z UI zarządzania |
| 2026-07-02 | ADR-037: rozliczenia — Model B rotacji (stan + anchor), zastąpienie Modelu A |
| 2026-07-06 | ADR-038: rozliczenia — roczne okresy rozliczeniowe, snapshot przy zamknięciu, `settlementYear` w API |
| 2026-07-06 | ADR-039: rozliczenia — wkłady własne (`source_exp_deposit`), Σ rotacji bez modelu kredytu |
| 2026-07-10 | ADR-040: podmenu Konfiguracji (Ogólne / Reguły / Dashboard), katalogi `general/` + `rules/` |
