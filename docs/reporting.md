# Raportowanie i analityka

## Stan implementacji

Moduł raportów jest **częściowo zaimplementowany**:

1. **Analizy** — `/app/raporty/analytics` z filtrami w URL (`year`, `month`, `walletId`); API `GET /api/reports/analytics`.
2. **Rozbicie** — `/app/raporty/breakdown` — **plansza UI (mock)** z wykresami i filtrami; dane z fixture, backend `GET /api/reports/breakdown` — do implementacji.
3. **Trend** — `/app/raporty/trend` — **plansza UI (mock)** wykresu miesięcznego; backend `GET /api/reports/trend` — do implementacji.
4. **Rozliczenia** — `/app/raporty/settlements` z zakładką konfiguracji; API `GET /api/reports/settlements` oraz `GET/PUT .../config`.
5. **Podstawowe statystyki transakcji** — endpoint API i dashboard.
6. **Lista transakcji z filtrami** — eksploracja operacyjna (nie raport formalny).

---

## Nawigacja (frontend)

- **Sidebar:** pozycja „Raporty” rozwija podmenu (nie zakładki w treści strony):
  - **Analizy** (`/raporty/analytics`)
  - **Rozbicie** (`/raporty/breakdown`) — mock UI
  - **Trend** (`/raporty/trend`) — mock UI
  - **Rozliczenia** (`/raporty/settlements`)
- **Layout raportów:** [`ReportsLayout.tsx`](../frontend/src/domains/home/reports/pages/ReportsLayout.tsx) — nagłówek + `<Outlet />` (bez poziomego podmenu).
- **Rozliczenia:** [`SettlementLayout.tsx`](../frontend/src/domains/home/reports/settlements/pages/SettlementLayout.tsx) — jeden pasek: **Podsumowanie | Wpłaty rotacyjne | Portfele | Pozostałe** (lewa strona) oraz **Konfiguracja** (prawa strona). Filtr okresu w [`SettlementReportLayout.tsx`](../frontend/src/domains/home/reports/settlements/pages/SettlementReportLayout.tsx) — na wszystkich 4 zakładkach raportu, nie na konfiguracji.

### Struktura katalogów (angielskie nazwy)

```
frontend/src/domains/home/reports/
├── pages/ReportsLayout.tsx
├── analytics/pages/AnalyticsReport.tsx
└── settlements/pages/
    ├── SettlementLayout.tsx
    ├── SettlementReportLayout.tsx
    ├── SettlementSummary.tsx
    ├── SettlementRotatingDeposits.tsx
    ├── SettlementWallets.tsx
    ├── SettlementOther.tsx
    └── SettlementSettings.tsx
```

### Trasy URL

| Trasa | Opis |
|-------|------|
| `/raporty` | redirect → `/raporty/analytics` |
| `/raporty/analytics` | analizy (obecnie: zestawienie miesięczne) |
| `/raporty/breakdown` | rozbicie wg kategorii/portfela/obszaru (mock) |
| `/raporty/trend` | trend miesięczny przychody/wydatki (mock) |
| `/raporty/settlements` | rozliczenie — podsumowanie |
| `/raporty/settlements/rotacyjne` | wpłaty rotacyjne (szczegóły) |
| `/raporty/settlements/portfele` | portfele Maćka/Basi |
| `/raporty/settlements/pozostale` | grupa „Inne” |
| `/raporty/settlements/settings` | konfiguracja rozliczenia |

**Legacy redirecty** (stare bookmarki): `/raporty/default/monthly`, `/raporty/analytics/monthly`, `/raporty/common-account`, `/raporty/miesieczny`, `/raporty/domyslne/miesieczny`, `/raporty/konto-wspolne`, `/raporty/konto-wspolne/konfiguracja`.

---

### Nawigacja okresu (UI)

Wspólny komponent [`PeriodNavigator.tsx`](../frontend/src/shared/components/PeriodNavigator.tsx) — używany w **Analizach** i na dashboardzie:

- **Domyślnie:** strzałki ← / → między miesiącami + ikona powrotu do bieżącego miesiąca.
- **Panel „Więcej”** (Analizy): prawy sidebar (`?panel=period`) z wyborem roku i miesiąca **albo** zakresem dat Od–Do.

**Rozliczenia** — filtr okresu (`SettlementDetailPeriodFilter`) na zakładkach raportu:

| Tryb | Zachowanie |
|------|------------|
| **Cały zakres** | przełącznik roku rozliczeniowego (← / →) w URL `?settlementYear=2026`; domyślnie bieżący rok |
| **Miesiące** | strzałki ← / etykieta miesiąca / → + powrót do bieżącego miesiąca (wyrównane do lewej) |
| **Zakres dat** | pola Od / Do inline |

Stan filtra współdzielony między zakładkami raportu. Zamknięte okresy (po 31.12) tylko do odczytu; odświeżanie wyłączone.

Parametry URL okresu: `year`+`month` **albo** `dateFrom`+`dateTo` — Analizy, dashboard. Rozliczenia: `settlementYear` (rok okresu rozliczeniowego).

---

## Analizy (MVP)

### API: `GET /api/reports/analytics`

Parametry query:

| Parametr | Wymagany | Opis |
|----------|----------|------|
| `year` + `month` | jedna para* | Skrót okresu (domyślnie bieżący miesiąc) |
| `dateFrom` + `dateTo` | alternatywa* | Dowolny zakres dat |
| `walletId` | nie | Filtr po portfelu (join na pozycje) |
| `concernId` | nie | W DTO backendu; brak w UI |
| `categoryId` | nie | W DTO backendu; brak w UI |

\*Podaj albo `year`+`month`, albo `dateFrom`+`dateTo`.

Odpowiedź (jak `GET /api/transactions/stats` w zakresie miesiąca):

```json
{
  "year": 2026,
  "month": 6,
  "dateFrom": "2026-06-01",
  "dateTo": "2026-06-30",
  "income": 0.00,
  "expenses": 0.00,
  "balance": 0.00,
  "unclassifiedCount": 0,
  "transactionCount": 0
}
```

Implementacja: `AnalyticsController`, `AnalyticsQuery`, `TransactionRepository::getPeriodStats()`.

Przykład: `/app/raporty/analytics?year=2026&month=6&walletId=2` lub `?dateFrom=2026-01-01&dateTo=2026-06-30`

---

## Rozliczenia (ledger v2)

Raport wylicza sugerowaną kolejną wpłatę Maćka/Basi na podmiot rozliczenia na podstawie **pozycji transakcji** (`transaction_items`): kierunek, Skąd/Dokąd (`paid_from` / `paid_to`), portfel pozycji. **Nie** opiera się na polu `concern`.

Indeks rozliczeń (`settlement_ledger_entry`) jest budowany z pozycji 1:1; stan na dany dzień odczytywany jest z ostatniego wiersza ledgera `operation_date <= dateTo`. Po zmianie transakcji lub konfiguracji ustawiane jest `needsRefresh` — użytkownik odświeża indeks przyciskiem w UI (`POST /refresh`).

### Model B „stan + anchor” (sugerowana wpłata)

Zastępuje wcześniejszy Model A (`base − carry`). Od `reindexFromDate`:

```
stan_maciek = Σ_wpłat_maciek − Σ_wpłat_basia
stan_basia  = −stan_maciek
```

- **Anchor** (kotwica) = osoba z ujemnym stanem (z tyłu w rotacji); przy remisie Σ przechodzi na drugą osobę względem poprzedniej kotwicy.
- **Sugerowana wpłata anchor:**
  ```
  catchUp = (stan < 0) ? (Σ_druga − Σ_anchor) : baseDeposit   // przy remisie: base
  suggested = max(0, catchUp + wallet_balance[anchor] − rotation_prepaid[anchor])
  ```
- **Podgląd nie-anchor:** `max(0, wallet_balance[osoba] − prepaid)` — bez składnika rotacyjnego (stan obecny).
- **Symulacja nie-anchor** (`personOutlook[osoba].afterAnchorDepositSimulation`): po hipotetycznej wpłacie kotwicy w wysokości jej `suggestedAmount` — pełna formuła rotacyjna dla drugiej osoby (jak gdyby stała się kotwicą). UI pokazuje symulowaną kwotę jako główną na karcie „Podgląd”.
- **Kwota bazowa** — `baseDepositAmount` z konfiguracji; składnik catch-up gdy stan kotwicy ≥ 0.
- **Wyrównanie (catch-up)** — gdy stan kotwicy &lt; 0: `Σ_druga − Σ_kotwica`; gdy stan ≥ 0: równa kwocie bazowej.
- Fakt portfelowy **nie zmienia** anchor (tylko saldo portfela w kwocie sugerowanej).
- Wpłata rotacyjna aktualizuje Σ i przelicza anchor (również wpłata „poza kolejką”).
- **Wkład własny** (`source_exp_deposit`): wydatek ze źródła wpłat (Skąd ∈ `maciekSourcePartyIds` / `basiaSourcePartyIds`) na portfel budżetu domowego, przy `paid_from ≠ settlementPartyId`; Dokąd nieistotne. Efekt w silniku jak `standard_deposit` (Σ + anchor). Szczegóły: ADR-039.

`rotation_prepaid` = wyłącznie **Prepaid Maciek/Basia na start** z konfiguracji. Pole `rotation_carry` w ledgerze deprecated (zawsze 0).

Po deploy zmian w klasyfikacji rozliczeń: **obowiązkowy** `POST /refresh`.

### Okresy rozliczeniowe (roczne)

- Okres = **rok kalendarzowy** (`01.01`–`31.12`), encja `settlement_period`.
- **Auto-zamknięcie** po 31.12 przy pierwszym żądaniu API w nowym roku: snapshot stanu rotacji/portfeli, otwarcie kolejnego roku ze stanu końcowego (`opening*` + `reindexFromDate` = 1.01).
- `reindexFromDate` — techniczny start ewidencji (transakcje wcześniejsze pomijane); pierwszy rok okresu = rok tej daty.
- UI: termin **„okres rozliczeniowy”** zamiast „indeks”; „indeks/ledger” pozostaje w warstwie technicznej.

### API: `GET /api/reports/settlements/periods`

Lista okresów użytkownika: `periods[]` (`year`, `dateFrom`, `dateTo`, `status`, `closedAt`), `currentYear`, `firstYear`.

### API: `GET /api/reports/settlements`

| Parametr | Wymagany | Opis |
|----------|----------|------|
| `settlementYear` | nie* | Rok okresu rozliczeniowego (domyślnie bieżący rok) |
| `year` + `month` | alternatywa** | Skrót miesiąca (legacy) |
| `dateFrom` + `dateTo` | alternatywa** | Dowolny zakres (legacy) |
| `nextDepositor` | nie | **deprecated** |
| `includePartial` | nie | Uwzględnij `PARTIALLY_CLASSIFIED` (domyślnie false) |

\*Domyślnie `settlementYear` = bieżący rok kalendarzowy.  
\*\*Podaj jeden tryb: `settlementYear` **albo** `year`+`month` **albo** `dateFrom`+`dateTo`.

Odpowiedź (skrót) — dodatkowo:

- `settlementPeriod` — `year`, `dateFrom`, `dateTo`, `status`, `effectiveFrom`, `effectiveTo`
- `settlementYear` — wybrany rok

Pozostałe pola bez zmian (`walletGroups`, `rotation`, `personOutlook`, `indexState`, …). Dodatkowo:

- `sourceExpenseDeposits` — wkłady własne (wydatek ze źródła na budżet domowy), per osoba: `{ maciek, basia }` z `total` i `items[]`.
- `standardDeposits` — wyłącznie przelewy (INCOME na konto rozliczenia).
- `rotation.maciekDepositsTotal` / `basiaDepositsTotal` — **łączna Σ** (przelewy + wkłady własne, skumulowane).
- `personOutlook[osoba].afterAnchorDepositSimulation` — tylko dla nie-kotwicy: `anchorPerson`, `anchorPaidAmount`, `suggestedAmount`, `catchUpAmount`, `walletNetCumulative`, `rotationPrepaid`, `formulaSummary`.

Dla **zamkniętego** okresu outlook z `closing_snapshot_json`; dla **otwartego** — ledger / replay.

**UI raportu** — pięć zakładek w górnym pasku (+ Konfiguracja po prawej). Wspólny filtr okresu na wszystkich zakładkach raportu:

1. **Podsumowanie** — kto wpłaca (badge „Teraz wpłaca”), sugerowana kwota / symulacja podglądu, wyliczenie formuły z objaśnieniami, przelewy i wkłady własne w okresie, portfele per osoba (filtrowane lokalnie), data ostatniego odświeżenia, przycisk **Odśwież rozliczenia**.
2. **Wpłaty rotacyjne** — tabele przelewów Maćka/Basi (INCOME na konto wspólne).
3. **Portfele** — wydatki/wpływy Maćka/Basi (filtrowane lokalnie).
4. **Wkłady własne** — wydatki ze źródeł wpłat na budżet domowy (filtrowane lokalnie).
5. **Pozostałe** — grupa informacyjna „Inne” (filtrowane lokalnie).

Outlook rotacji (`personOutlook`, `rotation`) pochodzi z ledgera i **nie zależy** od lokalnego filtra; filtr wpływa na liczby okresowe (wpłaty, wydatki, wpływy w tabelach).

Grupa **Inne** jest tylko informacyjna i **nie wpływa** na `personOutlook`.

Gdy `needsRefresh=true`, `personOutlook` odtwarzany jest replayem `SettlementRotationEngine` od `reindexFromDate` do `dateTo` (ten sam kod co indexer — bez legacy `carryOver*`).

### API: `POST /api/reports/settlements/refresh`

Atomowy rebuild indeksu: **czyści cały ledger użytkownika**, potem indeksuje wyłącznie transakcje z `operation_date >= reindexFromDate`. Stan początkowy silnika: `openingNextDepositor`, prepaid Maciek/Basia, opcjonalnie `openingWalletBalances`; **carry rotacji na start = 0** (pole `openingRotationCarry` w API zawsze 0, deprecated).

Raport z ledgera ignoruje wiersze sprzed `reindexFromDate`; dla okresów przed pierwszą pozycją indeksu używa sald początkowych (prepaid + kolej).

### API: konfiguracja

| Metoda | Endpoint |
|--------|----------|
| `GET` | `/api/reports/settlements/config` |
| `PUT` | `/api/reports/settlements/config` |

Pola konfiguracji (per użytkownik, tabela `settlement_config`):

- `settlementPartyId`, `homeBudgetWalletId`, `baseDepositAmount`
- `maciekSourcePartyIds`, `basiaSourcePartyIds`, `walletSettlementOwner`
- `defaultNextDepositor`
- **Indeks:** `reindexFromDate`, `openingWalletBalances` (opcjonalnie), `openingRotationPrepaidMaciek`, `openingRotationPrepaidBasia`, `openingNextDepositor`
- **Deprecated (ignorowane):** `openingRotationCarry` — zawsze 0
- **Stan indeksu (read-only z API):** `needsRefresh`, `refreshInProgress`, `lastRefreshedAt`, `lastRefreshStats`, `configVersion`
- **Legacy:** `carryOverMaciek`, `carryOverBasia` — deprecated, nieużywane w Modelu B

Wymaga skonfigurowania podmiotu rozliczenia i portfela budżetu domowego — inaczej `422`.

`needsRefresh` ustawiane przy: PUT config, klasyfikacji transakcji, imporcie, bulk update, zmianie reguł klasyfikacji.

### Backend (pliki)

```
backend/src/Home/Report/Settlement/
├── Controller/SettlementController.php
├── DTO/SettlementQuery.php
├── Entity/SettlementConfig.php, SettlementLedgerEntry.php
├── Repository/SettlementConfigRepository.php, SettlementItemQuery.php, SettlementLedgerRepository.php
└── Service/
    ├── SettlementService.php, SettlementConfigService.php
    ├── SettlementItemClassifier.php, SettlementRotationEngine.php, SettlementOutlookBuilder.php
    ├── SettlementIndexerService.php, SettlementIndexStateService.php
```

Migracje: `Version20260625120000` (config), `Version20260706120000` (repair rename → `settlement_config`), `Version20260628120000` (`settlement_ledger_entry` + kolumny indeksu).

---

## Co działa dziś (poza raportami formalnymi)

### API: `GET /api/transactions/stats`

Parametry opcjonalne: `dateFrom`, `dateTo`, `month` (`YYYY-MM`).

Implementacja: `TransactionRepository::getPeriodStats()`.

| Pole | Obliczenie |
|------|------------|
| `income` | Suma `amount_minor` gdzie `direction = INCOME` |
| `expenses` | Suma `ABS(amount_minor)` gdzie `direction = EXPENSE` |
| `balance` | `income - expenses` (w PLN, zaokrąglenie 2 miejsca) |
| `unclassifiedCount` | Liczba transakcji ze `status = UNCLASSIFIED` w zakresie dat |

**Uwaga:** Statystyki operują na poziomie **transakcji**, nie pozycji. Rozliczenia i filtr `walletId` w analizach używają join na `transaction_items`.

### Frontend: Dashboard (`/`)

Cztery karty: przychody, wydatki, saldo, niesklasyfikowane. URL: `/?month=YYYY-MM`.

---

## Lista i filtrowanie transakcji (analityka operacyjna)

`GET /api/transactions` — filtry dat, kierunek, status, Skąd/Dokąd, portfel, obszar, kategoria, kwota, opis, sortowanie, paginacja. Stan filtrów w URL (ADR-025).

---

## Plansze UI (mock w React)

Strony prototypowe z **danymi przykładowymi** (fixture w `frontend/src/domains/home/reports/shared/fixtures/`). Banner „Podgląd — dane przykładowe” na górze strony. Po akceptacji UX podłączenie backendu bez zmiany układu.

### Rozbicie (`BreakdownReport.tsx`)

- Filtry w URL (jak transakcje): okres, portfel, kategoria, kierunek, status, kwota, opis, Skąd/Dokąd.
- Przełącznik grupowania: kategorie główne / podkategorie / portfele / obszary.
- Kierunek: wydatki / przychody.
- KPI: suma, liczba pozycji, średnia, kwota bez kategorii.
- Wykresy (recharts): donut + słupki poziome + tabela z udziałem %.
- Drill-down: klik kategorii głównej → podkategorie (`groupBy=categorySub` + `categoryId`).

Docelowe API: `GET /api/reports/breakdown` — kształt odpowiedzi w `shared/types/breakdown.ts`.

### Trend (`TrendReport.tsx`)

- Wykres liniowy lub słupkowy: przychody, wydatki, saldo miesiąc po miesiącu (mock 6 miesięcy).
- Docelowe API: `GET /api/reports/trend`.

---

## Czego brakuje

- Okresy rozliczeniowe ze snapshotami i zamknięciem okresu (docelowy wariant rozliczeń)
- Zestawienia wg kategorii / obszarów (agregaty ogólne)
- Raport roczny, wykresy trendów
- Eksport danych (PDF, CSV)
- Budżet vs wykonanie
- Filtr zakresu dat w analizach (preset „Miesięczny”)

Wymagania produktowe: [open-questions.md](open-questions.md) (#19).

---

## Kierunki architektoniczne (przyszłość)

1. **Agregacje na poziomie pozycji** — standard dla raportów domowych (`transaction_items`).
2. **Rozszerzenie `/api/reports/...`** — wzorzec DTO query + serwis domenowy (jak `SettlementService`).
3. **Materialized views / cache** — przy większej liczbie transakcji.
