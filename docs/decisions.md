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

**Decyzja:** Po logowaniu `User.api_token` (64 hex) w nagłówku `Authorization: Bearer`. Firewall `stateless: true`.

**Pliki:** `ApiTokenAuthenticator.php`, `security.yaml`.

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

### ADR-019: Transakcje ręczne — specyfikacja MVP (planowane)

**Kontekst:** Stała `Transaction::SOURCE_MANUAL` istnieje; walidator obsługuje reguły Skąd/Dokąd dla źródła MANUAL, ale brak endpointu tworzenia.

**Decyzja (produktowa, do implementacji):**

| Pole | Wymagane |
|------|----------|
| `direction` | tak (INCOME / EXPENSE) |
| `operation_date` | tak |
| `amount` | tak |
| `description` | tak |
| Skąd / Dokąd | opcjonalne przy tworzeniu; reguły jak ADR-017 (OWN+CASH po stronie własnej) |
| Pozycje (portfel, dotyczy, kategoria) | opcjonalne; status liczy `TransactionStatusCalculator` |

**Przepływ:** Formularz „Nowa transakcja” → `POST /api/transactions` ze `source: MANUAL` → jedna domyślna pozycja (jak import) → dalsza klasyfikacja przez istniejące `PUT /{id}/items`.

**Stan implementacji:** **NIE ZAIMPLEMENTOWANE** (brak `POST`, brak UI tworzenia). Walidator gotowy: `assertManualOwnSideRules`.

**Pliki (plan):** `TransactionController`, serwis tworzenia, frontend formularz.

---

### ADR-020: Zakładki nawigowane przez URL (React Router)

**Kontekst:** Zakładki sterowane wyłącznie stanem lokalnym (`useState`) nie odzwierciedlają aktualnego widoku w adresie — brak deep linków, odświeżenie strony wraca do domyślnej zakładki, niedziałające zakładki wstecz/dalej w przeglądarce.

**Decyzja:** Każda zakładka (tab) na poziomie modułu ma własny segment ścieżki w React Router. Nawigacja przez `NavLink` + `<Outlet />` w layoucie rodzica; `index` przekierowuje na domyślną zakładkę.

**Wzorce URL (prefix SPA: `/app`):**

| Moduł | Layout | Przykłady |
|-------|--------|-----------|
| Konfiguracja | `Configuration` | `/app/konfiguracja/podmioty`, `/app/konfiguracja/portfele` |
| Import CSV | `ImportLayout` | `/app/import/nowy`, `/app/import/historia` |
| Ustawienia | `Settings` | `/app/ustawienia/uzytkownicy`, `/app/ustawienia/system` |

**Zasada:** Nowe moduły z zakładkami stosują ten sam wzorzec — bez wyjątków. Zakładki wewnętrzne (np. panel boczny transakcji) mogą pozostać w stanie lokalnym, jeśli nie są główną nawigacją modułu.

**Pliki:** `routes.tsx`, layouty z `<Outlet />` (`Configuration.tsx`, `ImportLayout.tsx`, `Settings.tsx`).

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

**Propozycja:** Nowe endpointy agregujące po `transaction_items` z GROUP BY category/wallet/concern.

**Powód:** Dashboard stats operuje na nagłówku transakcji, niewystarczające dla typowych raportów domowych.

---

### ADR-P06: ~~Automatyczne podmioty przy imporcie CSV~~

**Status:** Zrealizowane jako ADR-016.

---

### ADR-P07: Encja Budget z limitami

**Propozycja:** Rozdzielić `concern` (obszar) od `budget` (kwota + okres).

**Powód:** UI mówi o „budżetach”, schemat DB tego nie modeluje.

---

### ADR-P08: ~~API tworzenia transakcji ręcznych~~

**Status:** Specyfikacja w ADR-019; implementacja oczekuje.

---

## Historia dokumentu

| Data | Zmiana |
|------|--------|
| 2026-06-13 | Utworzenie rejestru na podstawie analizy kodu |
| 2026-06-13 | ADR-017: usunięcie direction_usage_*; reguły kontekstowe Skąd/Dokąd |
| 2026-06-13 | ADR-018 (portfel), ADR-019 (transakcje ręczne MVP — plan) |
