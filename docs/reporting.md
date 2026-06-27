# Raportowanie i analityka

## Stan implementacji

Moduł raportów jest **częściowo zaimplementowany**:

1. **Analizy** — `/app/raporty/analytics` z filtrami w URL (`year`, `month`, `walletId`); API `GET /api/reports/analytics`.
2. **Rozliczenia** — `/app/raporty/settlements` z zakładką konfiguracji; API `GET /api/reports/settlements` oraz `GET/PUT .../config`.
3. **Podstawowe statystyki transakcji** — endpoint API i dashboard.
4. **Lista transakcji z filtrami** — eksploracja operacyjna (nie raport formalny).

Folder `mock/` zawiera statyczne prototypy HTML — **nie są podłączone** do aplikacji React.

---

## Nawigacja (frontend)

- **Sidebar:** pozycja „Raporty” rozwija podmenu (nie zakładki w treści strony):
  - **Analizy** (`/raporty/analytics`)
  - **Rozliczenia** (`/raporty/settlements`)
- **Layout raportów:** [`ReportsLayout.tsx`](../frontend/src/domains/home/reports/pages/ReportsLayout.tsx) — nagłówek + `<Outlet />` (bez poziomego podmenu).
- **Rozliczenia:** zakładki *Raport* | *Konfiguracja* w [`SettlementLayout.tsx`](../frontend/src/domains/home/reports/settlements/pages/SettlementLayout.tsx).

### Struktura katalogów (angielskie nazwy)

```
frontend/src/domains/home/reports/
├── pages/ReportsLayout.tsx
├── analytics/pages/AnalyticsReport.tsx
└── settlements/pages/
    ├── SettlementLayout.tsx
    ├── SettlementReport.tsx
    └── SettlementSettings.tsx
```

### Trasy URL

| Trasa | Opis |
|-------|------|
| `/raporty` | redirect → `/raporty/analytics` |
| `/raporty/analytics` | analizy (obecnie: zestawienie miesięczne) |
| `/raporty/settlements` | rozliczenie wpłat — widok raportu |
| `/raporty/settlements/settings` | konfiguracja rozliczenia |

**Legacy redirecty** (stare bookmarki): `/raporty/default/monthly`, `/raporty/analytics/monthly`, `/raporty/common-account`, `/raporty/miesieczny`, `/raporty/domyslne/miesieczny`, `/raporty/konto-wspolne`, `/raporty/konto-wspolne/konfiguracja`.

---

## Analizy (MVP)

### API: `GET /api/reports/analytics`

Parametry query:

| Parametr | Wymagany | Opis |
|----------|----------|------|
| `year` | nie | Rok (domyślnie bieżący) |
| `month` | nie | Miesiąc 1–12 (domyślnie bieżący) |
| `walletId` | nie | Filtr po portfelu (join na pozycje) |
| `concernId` | nie | W DTO backendu; brak w UI |
| `categoryId` | nie | W DTO backendu; brak w UI |

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

Przykład: `/app/raporty/analytics?year=2026&month=6&walletId=2`

Docelowo: filtr zakresu dat z presetem „Miesięczny” (nie w URL).

---

## Rozliczenia (ledger v2)

Raport wylicza sugerowaną kolejną wpłatę Maćka/Basi na podmiot rozliczenia na podstawie **pozycji transakcji** (`transaction_items`): kierunek, Skąd/Dokąd (`paid_from` / `paid_to`), portfel pozycji. **Nie** opiera się na polu `concern`.

Indeks rozliczeń (`settlement_ledger_entry`) jest budowany z pozycji 1:1; stan na dany dzień odczytywany jest z ostatniego wiersza ledgera `operation_date <= dateTo`. Po zmianie transakcji lub konfiguracji ustawiane jest `needsRefresh` — użytkownik odświeża indeks przyciskiem w UI (`POST /refresh`).

### Model A „dopasuj” (sugerowana wpłata)

```
suggested = baseDeposit − rotation_carry + wallet_balance[osoba] − rotation_prepaid[osoba]
```

(w UI: `max(0, raw)`). Slot rotacji zamyka wpłata `standard_deposit` osoby na kolejce; wpłata poza kolejką **też zamyka bieżący slot** (bez naliczania prepaid w indeksie).

`rotation_prepaid` w formule to wyłącznie **Prepaid Maciek/Basia na start** z konfiguracji (od `reindexFromDate`). Transakcje z indeksu **nie zwiększają** prepaid — tylko carry, kolej i salda portfeli.

### API: `GET /api/reports/settlements`

| Parametr | Wymagany | Opis |
|----------|----------|------|
| `year` + `month` | jedna para* | Skrót okresu |
| `dateFrom` + `dateTo` | alternatywa* | Zakres dat (ma pierwszeństwo w UI gdy oba w URL) |
| `nextDepositor` | nie | `maciek` \| `basia` — nadpisuje auto z ledgera |
| `includePartial` | nie | Uwzględnij `PARTIALLY_CLASSIFIED` (domyślnie false) |

\*Podaj albo `year`+`month`, albo `dateFrom`+`dateTo`.

Odpowiedź (skrót):

- `walletGroups` — trzy grupy (`maciek`, `basia`, `other`), każda z `expenses`, `incomes` i `net`
- `standardDeposits` — wpłaty rotacyjne na portfel budżetu domowego
- `nextDeposit` — m.in. `suggestedAmount`, `rotationCarry`, `rotationPrepaid`, `walletBreakdown`, `asOfDate` (ostatni wpis ledgera — **niezależny od zakresu raportu**); `paidInPeriod` dotyczy wybranego okresu
- `indexState` — `needsRefresh`, `refreshInProgress`, `lastRefreshedAt`, `lastRefreshStats`
- `warnings`, `excludedItemsCount`

Grupa **Inne** jest tylko informacyjna i **nie wpływa** na `nextDeposit`.

Gdy `needsRefresh=true`, szczegóły okresu liczone są na żywo; `nextDeposit` korzysta z legacy `carryOver*` z configu.

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
- **Legacy:** `carryOverMaciek`, `carryOverBasia` — fallback gdy indeks nieaktualny

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
    ├── SettlementItemClassifier.php, SettlementBalanceEngine.php
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
