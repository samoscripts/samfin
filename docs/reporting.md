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

## Rozliczenia (MVP)

Raport wylicza sugerowaną kolejną wpłatę Maćka/Basi na podmiot rozliczenia na podstawie **pozycji transakcji** (`transaction_items`): kierunek, Skąd/Dokąd (`paid_from` / `paid_to`), portfel pozycji. **Nie** opiera się na polu `concern`.

### API: `GET /api/reports/settlements`

| Parametr | Wymagany | Opis |
|----------|----------|------|
| `year` + `month` | jedna para* | Skrót okresu |
| `dateFrom` + `dateTo` | alternatywa* | Zakres dat |
| `nextDepositor` | nie | `maciek` \| `basia` — nadpisuje auto z historii wpłat |
| `includePartial` | nie | Uwzględnij `PARTIALLY_CLASSIFIED` (domyślnie false) |

\*Podaj albo `year`+`month`, albo `dateFrom`+`dateTo`.

Odpowiedź (skrót):

- `walletGroups` — trzy grupy (`maciek`, `basia`, `other`), każda z `expenses`, `incomes` i `net` (wydatki − wpływy na przypisanych portfelach, poza budżetem domowym)
- `standardDeposits` — wpłaty rotacyjne na portfel budżetu domowego (Skąd z list Maćka/Basi)
- `nextDeposit` — `dueAmount`, `paidInPeriod`, `walletNet`, `corrections` (= saldo netto portfeli osoby wpłacającej, ze znakiem), `underpayment`, `carryForward`
- `warnings`, `excludedItemsCount`

Grupa **Inne** jest tylko informacyjna i **nie wpływa** na `nextDeposit`. Korekta wpłaty to pełne saldo netto grupy portfeli wpłacającej osoby (dodatnie zwiększa należność, ujemne ją zmniejsza).

Implementacja: `SettlementService`, `SettlementItemQuery`, `SettlementQuery`.

### API: konfiguracja

| Metoda | Endpoint |
|--------|----------|
| `GET` | `/api/reports/settlements/config` |
| `PUT` | `/api/reports/settlements/config` |

Pola konfiguracji (per użytkownik, tabela `settlement_config`):

- `settlementPartyId`, `homeBudgetWalletId`
- `baseDepositAmount` (domyślnie 5000)
- `maciekSourcePartyIds`, `basiaSourcePartyIds` — podmioty Skąd uznawane za wpłaty danej osoby
- `walletSettlementOwner` — mapowanie portfela → `maciek` \| `basia` dla korekt
- `defaultNextDepositor`, `carryOverMaciek`, `carryOverBasia`

Wymaga skonfigurowania podmiotu rozliczenia i portfela budżetu domowego — inaczej `422`.

### Backend (pliki)

```
backend/src/Home/Report/
├── Analytics/
│   ├── Controller/AnalyticsController.php
│   └── DTO/AnalyticsQuery.php
└── Settlement/
    ├── Controller/SettlementController.php
    ├── DTO/SettlementQuery.php
    ├── Entity/SettlementConfig.php
    ├── Repository/SettlementConfigRepository.php
    ├── Repository/SettlementItemQuery.php
    └── Service/
        ├── SettlementService.php
        └── SettlementConfigService.php
```

Migracje: `Version20260625120000` (tabela config), `Version20260626120000` (repair), `Version20260627120000` (rename → `settlement_config`).

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
