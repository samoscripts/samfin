# Raportowanie i analityka

## Stan implementacji

Moduł raportów jest **częściowo zaimplementowany**:

1. **Analizy** — `/app/raporty/analytics` z filtrami w URL (`year`, `month`, `walletId`); API `GET /api/reports/analytics`.
2. **Rozbicie** — `/app/raporty/breakdown` z filtrami w URL; API `GET /api/reports/breakdown` (agregacja pozycji, spec poniżej).
3. **Trend** — `/app/raporty/trend` — wykres liniowy/słupkowy z porównaniem serii; API `GET /api/reports/trend` (agregacja pozycji w czasie, spec poniżej).
4. **Rozliczenia** — `/app/raporty/settlements` z zakładką konfiguracji; API `GET /api/reports/settlements` oraz `GET/PUT .../config`.
5. **Podstawowe statystyki transakcji** — endpoint API i dashboard.
6. **Lista transakcji z filtrami** — eksploracja operacyjna (nie raport formalny).

---

## Nawigacja (frontend)

- **Sidebar:** pozycja „Raporty” rozwija podmenu (nie zakładki w treści strony):
  - **Analizy** (`/raporty/analytics`)
  - **Rozbicie** (`/raporty/breakdown`)
  - **Trend** (`/raporty/trend`)
  - **Rozliczenia** (`/raporty/settlements`)
- **Layout raportów:** [`ReportsLayout.tsx`](../frontend/src/domains/home/reports/pages/ReportsLayout.tsx) — nagłówek + `<Outlet />` (bez poziomego podmenu).
- **Rozliczenia:** [`SettlementLayout.tsx`](../frontend/src/domains/home/reports/settlements/pages/SettlementLayout.tsx) — jeden pasek: **Podsumowanie | Wpłaty rotacyjne | Portfele | Pozostałe** (lewa strona) oraz **Konfiguracja** (prawa strona). Filtr okresu w [`SettlementReportLayout.tsx`](../frontend/src/domains/home/reports/settlements/pages/SettlementReportLayout.tsx) — na wszystkich 4 zakładkach raportu, nie na konfiguracji.

### Struktura katalogów (angielskie nazwy)

```
frontend/src/domains/home/reports/
├── pages/ReportsLayout.tsx
├── shared/                    # okres, panel prawy, kolory wykresów, fixture transakcji
│   ├── hooks/useReportRightPanel.tsx   # jeden portal: Filtry | Szczegóły | Edycja
│   ├── utils/reportPanelUrl.ts         # ?panel=filters, tx, tab
├── analytics/pages/AnalyticsReport.tsx
├── breakdown/pages/BreakdownReport.tsx
├── trend/
│   ├── pages/TrendReport.tsx
│   ├── components/            # TrendSidebar, TrendChart, chipy filtrów
│   ├── fixtures/trend.fixture.ts
│   ├── types/trend.ts
│   └── utils/trendUrl.ts
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
| `/raporty/breakdown` | rozbicie wg kategorii/portfela/obszaru |
| `/raporty/trend` | trend przychody/wydatki w czasie; porównanie serii |
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
- **Panel „Więcej”** (Analizy): prawy panel (`?panel=filters`) z wyborem roku i miesiąca **albo** zakresem dat Od–Do — [`useReportRightPanel`](../frontend/src/domains/home/reports/shared/hooks/useReportRightPanel.tsx), zakładka „Okres i portfel”.

**Rozliczenia** — filtr okresu (`SettlementDetailPeriodFilter`) na zakładkach raportu:

| Tryb | Zachowanie |
|------|------------|
| **Cały zakres** | przełącznik roku rozliczeniowego (← / →) w URL `?settlementYear=2026`; domyślnie bieżący rok |
| **Miesiące** | strzałki ← / etykieta miesiąca / → + powrót do bieżącego miesiąca (wyrównane do lewej) |
| **Zakres dat** | pola Od / Do inline |

Stan filtra współdzielony między zakładkami raportu. Zamknięte okresy (po 31.12) tylko do odczytu; odświeżanie wyłączone.

Parametry URL okresu: `year`+`month` **albo** `dateFrom`+`dateTo` — Analizy, dashboard. Rozliczenia: `settlementYear` (rok okresu rozliczeniowego).

### Prawy panel raportów (Rozbicie, Trend, Analizy)

Jeden portal (`useReportRightPanel` + `SidePanelShell`): zakładki **Filtry i okres** (w Analizach: **Okres i portfel**) oraz **Szczegóły** po kliknięciu wiersza transakcji w drill-down. Edycja transakcji = trzecia zakładka **Edycja**. URL: `panel=filters` otwiera panel; `tx` + `tab=details` przełącza na szczegóły bez zamykania filtrów. Domyślna szerokość przy otwarciu: 420px (`NARROW_PANEL_WIDTH`), resize + expand w pasku zakładek. Rozliczenia nadal używają osobnego `useTransactionPanel`.

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

## Wygląd i konfiguracja wykresów

Raporty **Trend** i **Rozbicie** korzystają z realnego API (mocki i `MockBanner` usunięte). Poniżej wspólna konfiguracja wykresów.

### Wygląd wykresów (`chartStyle`)

**Globalna paleta** kolorów dla **Trendu** i **Rozbicia** — zakładka **Konfiguracja** w sidebarze filtrów (obok **Parametry raportu**). Zmiana natychmiastowa, bez „Zastosuj”.

| Parametr URL | Wartości | Domyślnie |
|--------------|----------|-----------|
| `chartStyle` | patrz tabele poniżej | `rainbow` |

Persystencja: `localStorage` (`fin.chartStyle`). Priorytet: URL → localStorage → domyślny.

**Zasada kolorów:** każda **seria / kategoria** ma **inny kolor** (niebieski, zielony, żółty…). W obrębie serii: wpływ = jaśniejszy odcień, wydatek = ciemniejszy **tej samej** barwy. Wyjątek: palety **jednej tonacji** (3 szt.) — wszystkie serie w tej samej rodzinie barw.

**Różnorodne** (`kind: diverse`):

| ID | Opis |
|----|------|
| `rainbow` | Pełne zróżnicowanie — niebieski, zielony, żółty, pomarańcz, róż… |
| `vivid` | Nasycone, wyraziste kolory |
| `pastel` | Miękkie pastele — wydatki ciemniejsze |
| `spring` | Świeże, wiosenne tony |
| `autumn` | Ciepłe jesienne barwy |
| `cool` | Chłodne: błękit, turkus, fiolet |
| `warm` | Ciepłe: żółć, pomarańcz, róż |
| `candy` | Jaskrawe „cukierkowe” odcienie |

**Jedna tonacja** (`kind: mono`):

| ID | Opis |
|----|------|
| `graphite` | Skala szarości |
| `forest` | Zielenie (wpływy) i czerwienie (wydatki) |
| `brand` | Zieleń i złoto aplikacji SamFin |

**Sidebar:** zakładki `Parametry raportu` \| `Konfiguracja` — [`ReportSidebarTabs.tsx`](../frontend/src/domains/home/reports/shared/components/ReportSidebarTabs.tsx).

**Trend (słupkowy):** para wydatek\|wpływ styka się (`barGap` ujemny), kolejność: wydatek → wpływ.

Implementacja: [`chartPalettes.ts`](../frontend/src/shared/components/charts/chartPalettes.ts), [`chartStyle.ts`](../frontend/src/shared/components/charts/chartStyle.ts), [`useChartStyle.ts`](../frontend/src/shared/hooks/useChartStyle.ts), [`ChartStyleSection.tsx`](../frontend/src/domains/home/reports/shared/components/ChartStyleSection.tsx).

### Wspólne komponenty wykresów kierunkowych (Faza 2)

Reużywalne komponenty w `frontend/src/shared/components/charts/` — fundament pod nowe typy wykresów w Trendzie (Faza 3) i Rozbiciu (Faza 4):

| Komponent | Plik | Opis |
|-----------|------|------|
| Skojarzony (para wydatek\|wpływ) | `DirectionGroupedBarChart.tsx` | `getPairedBarRadius`, `CHART_PAIRED_BAR_GAP` |
| Skumulowany | `DirectionStackedBarChart.tsx` | `stackId` — wydatek dół, wpływ góra |
| Zwierciadlany | `DirectionDivergingBarChart.tsx` | Wydatek ujemny, wpływ dodatni |
| Bilans | `DirectionBalanceBarChart.tsx` | `net = income − expenses`, kolor wg znaku |
| Obszarowy | `DirectionAreaChart.tsx` | `AreaChart` z seriami per kierunek |
| Heatmapa | `ChartHeatmap.tsx` | Siatka seria × okres (HTML table) |

Helpery: [`buildDirectionChartSeries.ts`](../frontend/src/shared/components/charts/buildDirectionChartSeries.ts) (mapowanie Trend/Rozbicie → serie Recharts), [`directionChartTypes.ts`](../frontend/src/shared/components/charts/directionChartTypes.ts) (`DirectionChartSelection`), [`chartDirectionBarStyle.ts`](../frontend/src/shared/components/charts/chartDirectionBarStyle.ts) (`getHeatmapCellPaint`, `getBalanceCellPaint`). Limit Top N: uogólnione [`limitItemsForChart`](../frontend/src/domains/home/reports/shared/utils/chartTopGroups.ts).

Testy Vitest: `chartDirectionBarStyle.test.ts`, `buildDirectionChartSeries.test.ts`, `chartTopGroups.test.ts`.

### Rozbicie (`BreakdownReport.tsx`)

- Filtry w URL (jak transakcje): okres, portfel, kategoria, kierunek, kwota, opis, Skąd/Dokąd (UI nie udostępnia filtra statusu).
- Przełącznik grupowania: kategorie główne / podkategorie / portfele / obszary.
- **Kierunek:** multi-toggle Wydatki / Przychody (`reportDirections` w URL; domyślnie tylko Wydatek — brak parametru). Parsowanie: [`breakdownUrl.ts`](../frontend/src/domains/home/reports/breakdown/utils/breakdownUrl.ts).
- **KPI:** przy jednym kierunku — suma, liczba pozycji, średnia, kwota bez kategorii; przy obu kierunkach — Wydatki, Wpływy, Bilans, liczba pozycji.
- Wykresy (recharts): słupki pionowe/poziome + tabela; przy obu kierunkach wykresy pokazują **wydatki** per grupa (sortowanie po obrocie), zakładka kołowa ukryta.
- Tabela przy obu kierunkach: kolumny Wydatek \| Wpływ \| Bilans (bez udziału %).
- Drill-down: klik kategorii głównej → podkategorie (`groupBy=categorySub` + `categoryId`).
- Klik grupy → panel z kompaktową tabelą transakcji (`FilteredTransactionsTable` + `useFlowsQuery`), klik wiersza → zakładka **Szczegóły** w tym samym prawym panelu (`useReportRightPanel`); link do pełnej wyszukiwarki w stopce tabeli. Filtr kierunku w drill-down: `directions` w `FlowFilters` (oba kierunki gdy zaznaczone oba).

#### API: `GET /api/reports/breakdown`

Agregacja **pozycji transakcji** (`transaction_items`) w jednym okresie — kompozycja wg wybranego wymiaru (bez osi czasu). W przeciwieństwie do Trendu i Analiz (transakcje) — **sumy na poziomie pozycji**.

Implementacja: `Home/Report/Breakdown/` (Controller + DTO + `BreakdownService`) + wspólny filtr `Home/Report/Shared/` (`ReportItemFilterCriteria`, `ReportItemQuery`). Wzorzec joinów: `SettlementItemQuery.php`.

Parametry query:

| Parametr | Wymagany | Opis |
|----------|----------|------|
| `dateFrom` + `dateTo` | tak* | Zakres dat raportu (`t.trans_date`) |
| `year` + `month` | alternatywa* | Skrót okresu — backend normalizuje do `dateFrom`/`dateTo` (jak Analytics) |
| `groupBy` | nie | `categoryMain` (domyślnie), `categorySub`, `wallet`, `concern` |
| `reportDirection` | nie | `EXPENSE` (domyślnie) lub `INCOME` — filtr `t.direction` (jeden kierunek; kompatybilność wsteczna) |
| `reportDirections` | nie | CSV: `EXPENSE`, `INCOME` lub oba (np. `EXPENSE,INCOME`); ma pierwszeństwo nad `reportDirection` gdy ustawione |
| `walletId` | nie | Zawężenie pozycji do portfela (`ti.wallet_id`) |
| `categoryId` | nie | Przy `groupBy=categorySub` — tylko podkategorie tej kategorii głównej; przy innych `groupBy` — zawężenie pozycji do kategorii |
| `concernId` | nie | Zawężenie Dotyczy (`ti.concern_id`) |
| `description` | nie | Szukaj w opisie (tytuł / opis transakcji / opis pozycji `ti.description`) |
| `amountMin`, `amountMax` | nie | Zakres kwoty **pozycji** w PLN (`ABS(ti.amount_minor)`) |
| `paidFromPartyId`, `paidToPartyId` | nie | Jak w filtrach transakcji |

\*Jeden spójny sposób okresu — jak `GET /api/reports/analytics`. Frontend zawsze wysyła wyliczone `dateFrom`/`dateTo` z `reportPeriod.ts`.

**Nie w API (tylko FE):** `chartTop` — limit wykresu („Top N” + „Pozostałe”) liczy frontend z pełnej listy `groups`.

**Status transakcji:** UI nie udostępnia filtra statusu. Backend uwzględnia pozycje transakcji ze `status IN ('CLASSIFIED', 'PARTIALLY_CLASSIFIED')`.

Reguły agregacji:

- Źródło: `transaction_items ti` JOIN `transactions t` (+ słowniki wg `groupBy`).
- Kwota pozycji: `ABS(ti.amount_minor) / 100` (2 miejsca); filtr kierunku z `reportDirection` lub `reportDirections`.
- **Jeden kierunek:** zachowanie jak dotychczas (`amount`, `share` względem sumy tego kierunku).
- **Oba kierunki (`reportDirections=EXPENSE,INCOME`):** pivot na grupę — `expenses`, `income`, `share` (udział wydatków), `shareIncome` (udział wpływów); `amount` = obrót grupy (`expenses + income`) do sortowania; `totals: { expenses, income, net }`; skalar `total` = `totals.expenses` (kompatybilność wsteczna KPI wydatków).
- **`groupBy=categoryMain`:** grupuj po kategorii głównej — `COALESCE(category.parent_id, category.id)`; nazwa = nazwa kategorii głównej.
- **`groupBy=categorySub`:** grupuj po `ti.category_id`. Gdy `categoryId` ustawione — tylko dzieci tej kategorii; bez `categoryId` — wszystkie podkategorie w okresie.
- **`groupBy=wallet`:** grupuj po `ti.wallet_id`; `id=null` → „Bez portfela”.
- **`groupBy=concern`:** grupuj po `ti.concern_id` (pole **Dotyczy**); `id=null` → „Bez Dotyczy”.
- **Grupa „Bez kategorii”:** `id: null`, `name: "Bez kategorii"` — pozycje z `ti.category_id IS NULL`.
- **`unclassifiedAmount`:** suma kwot pozycji z `ti.category_id IS NULL` (liczona w zakresie tego samego zbioru co grupy).
- **`share`:** `amount / total * 100`, 1 miejsce po przecinku; przy `total=0` → `0`.
- **`averageAmount`:** `total / itemCount` (2 miejsca); przy `itemCount=0` → `0`.
- Sortowanie `groups`: malejąco po `amount`.

Odpowiedź (zgodna z `BreakdownReportData` / `shared/types/breakdown.ts`):

```json
{
  "dateFrom": "2025-01-01",
  "dateTo": "2025-01-31",
  "groupBy": "categoryMain",
  "direction": "EXPENSE",
  "total": 4820.75,
  "itemCount": 114,
  "averageAmount": 42.29,
  "unclassifiedAmount": 120.00,
  "groups": [
    { "id": 1, "name": "Żywność", "amount": 1240.50, "share": 25.7, "itemCount": 34 },
    { "id": null, "name": "Bez kategorii", "amount": 120.00, "share": 2.5, "itemCount": 3 }
  ]
}
```

- `direction` w odpowiedzi = echo pierwszego kierunku z zapytania (kompatybilność wsteczna).
- `directions` w odpowiedzi = lista kierunków z zapytania.
- Przy obu kierunkach dodatkowo: `totals`, pola `expenses`/`income`/`shareIncome` na grupach.
- `id` grupy: ID encji słownikowej lub `null` dla bucketów „bez wartości”.

**Drill-down transakcji (FE):** klik grupy → panel z tabelą transakcji pobraną przez `GET /api/transactions` (hook `useFlowsQuery`, filtry `FlowFilters` — ten sam mechanizm co lista `/transakcje`). Mapowanie grupy: [`breakdownDrillDownFilters.ts`](../frontend/src/domains/home/reports/breakdown/utils/breakdownDrillDownFilters.ts). Klik wiersza przełącza prawy panel na zakładkę **Szczegóły** (`useReportRightPanel`, URL: `panel=filters` + `tx` + `tab=details`). **Uwaga:** raport liczy na pozycjach (`ti.description`, `ABS(ti.amount_minor)`), a lista filtruje na nagłówkach (`t.amount_minor`, opis transakcji) — przy filtrach opisu/kwoty wyniki mogą się różnić od raportu. Pełną zgodność da przyszłe rozszerzenie API o filtry item-level. Grupy „Pozostałe” i „bez wartości” (`id === null`) nie mają dedykowanego filtra — tabela pokazuje okres, kierunek i filtry raportu z komunikatem.

Przykłady URL FE:

- Kategorie główne, wydatki (domyślnie): `/app/raporty/breakdown?dateFrom=2025-01-01&dateTo=2025-01-31&groupBy=categoryMain`
- Podkategorie Żywności: `…&groupBy=categorySub&categoryId=1`
- Portfele, wpływy: `…&groupBy=wallet&reportDirections=INCOME`
- Oba kierunki: `…&reportDirections=EXPENSE,INCOME`

### Trend (`TrendReport.tsx`)

- **Okres:** ten sam model co Rozbicie/Analizy (`year`+`month`, kwartał, zakres `dateFrom`+`dateTo`) — [`reportPeriod.ts`](../frontend/src/domains/home/reports/shared/utils/reportPeriod.ts).
- **Kierunek:** multi-toggle Wpływ / Wydatek (`trendDirections`, domyślnie tylko Wydatek).
- **Porównanie serii** (`trendSeriesBy`): brak | opisy | kategorie | portfele | Dotyczy — **jeden wymiar naraz**; wiele wartości w ramach wymiaru (`trendTerms`, `trendCategoryIds`, `trendWalletIds`, `trendConcernIds`).
- **Zawężenie** (filtry opcjonalne): opis, kategoria, portfel, Dotyczy, kwota od/do — ukrywane w sidebarze, gdy ten sam wymiar jest użyty jako `seriesBy`.
- **Granularność:** zależna od trybu okresu w sidebarze — zakładki nad wykresem:
  - tryb **miesiąc** / **kwartał** — brak wyboru (miesięczne kubełki w kwartale);
  - tryb **rok** — Miesięczny \| Kwartalny (`trendGranularity`);
  - tryb **zakres dat** — Miesięczny \| Kwartalny \| Roczny.
- **Wykres:** typ w URL `chart` — domyślnie **słupkowy** (brak parametru); dostępne: `line`, `bar`, `stacked`, `area`, `diverging`, `heatmap` ([`trendChartType.ts`](../frontend/src/domains/home/reports/trend/utils/trendChartType.ts)). Skumulowany i zwierciadlany wymagają obu kierunków; heatmapa wymaga `trendSeriesBy≠none`. Auto-fallback do `bar` gdy typ niedostępny.
- **Top serii** (`chartTop` w URL): przy porównaniu serii — limit Top N + „Pozostałe” ([`trendChartData.ts`](../frontend/src/domains/home/reports/trend/utils/trendChartData.ts)); ostrzeżenie UX przy >8 seriach.
- Stały panel wartości w prawym górnym rogu wykresu ([`ChartHoverPanel.tsx`](../frontend/src/shared/components/charts/ChartHoverPanel.tsx)) — bez tooltipu zasłaniającego wykres (Trend + Rozbicie).
- **Schemat kolorów:** globalny `chartStyle` (patrz wyżej); przy obu kierunkach — para słupków wydatek\|wpływ stykająca się.
- Klik pojedynczego słupka (okres + seria) → panel z tabelą transakcji pod wykresem (ten sam `FilteredTransactionsTable` + `useReportRightPanel` co Rozbicie); wspólny styl słupków ([`chartBarShared.ts`](../frontend/src/shared/components/charts/chartBarShared.ts), [`chartDirectionBarStyle.ts`](../frontend/src/shared/components/charts/chartDirectionBarStyle.ts)).

Typy FE: [`trend/types/trend.ts`](../frontend/src/domains/home/reports/trend/types/trend.ts). Parsowanie URL + filtry drill-down: [`trend/utils/trendUrl.ts`](../frontend/src/domains/home/reports/trend/utils/trendUrl.ts) (`trendSelectionToFlowFilters`).

#### API: `GET /api/reports/trend`

Agregacja **pozycji transakcji** (`transaction_items`) w kubełkach czasowych. W przeciwieństwie do Rozbicia — oś czasu zamiast kompozycji w jednym okresie.

Parametry query:

| Parametr | Wymagany | Opis |
|----------|----------|------|
| `dateFrom` + `dateTo` | tak* | Zakres dat raportu |
| `year` + `month` / kwartał | alternatywa* | Skrót okresu (jak inne raporty) — backend normalizuje do `dateFrom`/`dateTo` |
| `trendSeriesBy` | nie | `none` (domyślnie), `description`, `category`, `wallet`, `concern` |
| `trendTerms` | nie | Lista opisów (CSV), gdy `seriesBy=description` |
| `trendCategoryIds` | nie | ID kategorii (CSV), gdy `seriesBy=category` |
| `trendWalletIds` | nie | ID portfeli (CSV), gdy `seriesBy=wallet` |
| `trendConcernIds` | nie | ID Dotyczy (CSV), gdy `seriesBy=concern` |
| `trendDirections` | nie | `EXPENSE`, `INCOME` lub oba (CSV); domyślnie `EXPENSE` |
| `trendGranularity` | nie | `month`, `quarter` lub `year`; widoczność i dozwolone wartości zależą od `periodMode` (patrz UI powyżej) |
| `description` | nie | Zawężenie: opis zawiera (gdy `seriesBy≠description`) |
| `categoryId` | nie | Zawężenie pojedynczej kategorii (gdy `seriesBy≠category`) |
| `walletId` | nie | Zawężenie portfela (gdy `seriesBy≠wallet`) |
| `concernId` | nie | Zawężenie Dotyczy (gdy `seriesBy≠concern`) |
| `amountMin`, `amountMax` | nie | Zakres kwoty pozycji |
| `paidFromPartyId`, `paidToPartyId` | nie | Jak w filtrach transakcji |

\*Jeden spójny sposób określenia okresu — jak [`GET /api/reports/analytics`](#analizy-mvp).

Reguły:

- Gdy `trendSeriesBy=none` — jedna seria „Razem” (sumy w kubełku).
- Gdy `seriesBy≠none` — każda wartość z listy to osobna seria; brak listy → pusta odpowiedź lub `422`.
- Nie mieszać wymiarów serii (np. kategorie + portfele jednocześnie) — tylko przez `trendSeriesBy`.
- `concern` w API = pole **Dotyczy** (Basia, Maciek, Wspólne), nie obszar domowy.

Odpowiedź (zgodna z `TrendReportData`):

```json
{
  "dateFrom": "2025-01-01",
  "dateTo": "2025-12-31",
  "granularity": "month",
  "seriesBy": "description",
  "points": [
    {
      "period": "2025-01",
      "label": "Sty",
      "totals": { "income": 0, "expenses": 4200.50 },
      "series": [
        { "id": "term:Allegro", "name": "Allegro", "income": 0, "expenses": 890.00 },
        { "id": "term:Biedronka", "name": "Biedronka", "income": 0, "expenses": 1200.00 }
      ]
    }
  ]
}
```

- `period`: `YYYY-MM` dla `month`, `YYYY-Qn` dla `quarter`, `YYYY` dla `year`.
- `income` / `expenses`: sumy w PLN (2 miejsca), zgodnie z kierunkiem pozycji; filtrowane wg `trendDirections`.
- `totals`: suma wszystkich serii w kubełku (przy `seriesBy=none` — to jedyna seria logiczna).

Przykład URL FE: `/app/raporty/trend?dateFrom=2025-01-01&dateTo=2025-12-31&trendSeriesBy=description&trendTerms=Allegro,Biedronka&trendDirections=EXPENSE`

---

## Zapisane raporty (Trend / Rozbicie)

Parametry raportu można zapisać per użytkownik i typ (`trend` | `breakdown`).

### API

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/api/report-saved?type=trend\|breakdown` | Lista zapisanych raportów |
| POST | `/api/report-saved` | Utworzenie — `{ type, name, description?, params }` |
| PUT | `/api/report-saved/{id}` | Aktualizacja nazwy, opisu i/lub `params` |
| DELETE | `/api/report-saved/{id}` | Usunięcie |

- Unikalność nazwy: `(user_id, type, name)` — osobno dla Trend i Rozbicie.
- `description` — opcjonalny (max 2000 znaków).
- `params` — JSON ze snapshotem parametrów (okres, filtry, grupowanie itd.; bez `chartStyle`, `panel`, `tx`).

#### Kształt `params`

**Rozbicie** (`type: breakdown`):

```json
{
  "period": { "mode": "range", "year": 2025, "month": 7, "quarter": 3, "dateFrom": "2025-01-01" },
  "groupBy": "categoryMain",
  "reportDirections": ["EXPENSE"],
  "chartTop": 8,
  "filters": { }
}
```

- `reportDirections` — tablica `EXPENSE` \| `INCOME` (zapis nowy). Stary klucz `reportDirection` (string) jest akceptowany przy wczytywaniu — migracja w [`reportSavedParams.ts`](../frontend/src/domains/home/reports/shared/utils/reportSavedParams.ts). Testy: [`reportSavedParams.test.ts`](../frontend/src/domains/home/reports/shared/utils/reportSavedParams.test.ts) (`make test-fe`).

- `chartTop` — wartość wybrana przez użytkownika (clamp do liczby grup dotyczy tylko wykresu, nie zapisu).
- `period.dateFrom` / `dateTo` — tylko przy `mode: "range"` (puste = otwarty zakres, brak klucza).

**Trend** (`type: trend`):

```json
{
  "period": { "mode": "range", "year": 2025, "month": 7, "quarter": 3 },
  "chartType": "stacked",
  "chartTop": 8,
  "granularity": "quarter",
  "query": { "seriesBy": "category", "directions": ["EXPENSE", "INCOME"], "granularity": "quarter", "terms": [], "categoryIds": ["1", "2"], "walletIds": [], "concernIds": [], "narrow": { } }
}
```

- `chartType` — `line` | `bar` | `stacked` | `area` | `diverging` | `heatmap` (odzwierciedlenie URL `chart=`).
- `chartTop` — limit serii na wykresie (gdy `seriesBy≠none`; clamp tylko w UI).
- `granularity` — `month` | `quarter` | `year` (przyciski podziału czasu; przy `month`/`quarter` okresu implicit `month`).
- Stary format `chart: "line"` jest akceptowany przy wczytywaniu (migracja do `chartType`).

#### Załadowany raport (baner „Zaczytany raport”)

- Po wyborze raportu w URL ustawiane są parametry + `reportSavedId` w jednym kroku.
- Baner i przycisk **Aktualizuj** pozostają aktywne przy dowolnej zmianie parametrów (okres, filtry, typ wykresu, podział czasu) — użytkownik może zapisać zmiany jednym kliknięciem.
- Odpięcie raportu następuje tylko jawnie: wybór innego z listy, usunięcie, utworzenie nowego (zastępuje `reportSavedId`).

### Frontend

- Sidebar raportów: zakładki **Parametry raportu** | **Zapisane raporty** | **Konfiguracja**.
- Stopka: **Zastosuj** | **Utwórz raport** | **Aktualizuj** (ostatni aktywny tylko przy załadowanym raporcie).
- URL załadowanego raportu: `reportSavedId={id}`.
- Wybór z listy → wypełnienie parametrów + automatyczne ładowanie wykresu.

---

## Otwarte zakresy dat (transakcje i raporty)

W filtrach dat (`dateFrom` / `dateTo`) każde pole może być puste (przycisk X w UI):

| `dateFrom` | `dateTo` | Znaczenie |
|------------|----------|-----------|
| ustawione | puste | `>= dateFrom` |
| puste | ustawione | `<= dateTo` |
| oba puste (tryb `periodMode=range`) | | brak filtra daty |
| oba ustawione | | zamknięty zakres (walidacja: from ≤ to) |

Tryby `year` / `quarter` / `month` — bez zmian (zawsze domknięty okres).

---

## Czego brakuje

- Okresy rozliczeniowe ze snapshotami i zamknięciem okresu (docelowy wariant rozliczeń)
- Filtry item-level w API transakcji (opis/kwota pozycji) — pełna zgodność drill-down z agregacjami raportów
- Skróty okresu `year`/`month`/`quarter` w API Rozbicia/Trendu na poziomie UI (backend przyjmuje `year`+`month`)
- Eksport danych (PDF, CSV)
- Budżet vs wykonanie
- Filtr zakresu dat w analizach (preset „Miesięczny”)

Wymagania produktowe: [open-questions.md](open-questions.md) (#19).

---

## Kierunki architektoniczne (przyszłość)

1. **Agregacje na poziomie pozycji** — standard dla raportów domowych (`transaction_items`).
2. **Rozszerzenie `/api/reports/...`** — wzorzec DTO query + serwis domenowy (jak `SettlementService`).
3. **Materialized views / cache** — przy większej liczbie transakcji.
