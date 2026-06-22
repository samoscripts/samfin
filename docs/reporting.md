# Raportowanie i analityka

## Stan implementacji

Moduł raportów jest **częściowo zaimplementowany**:

1. **Raport miesięczny** — `/app/raporty/miesieczny` z filtrami w URL (`year`, `month`, `walletId`); API `GET /api/reports/monthly`.
2. **Podstawowe statystyki transakcji** — endpoint API i dashboard.
3. **Lista transakcji z filtrami** — eksploracja operacyjna (nie raport formalny).

Folder `mock/` zawiera statyczne prototypy HTML — **nie są podłączone** do aplikacji React.

---

## Raport miesięczny (MVP)

### API: `GET /api/reports/monthly`

Parametry query:

| Parametr | Wymagany | Opis |
|----------|----------|------|
| `year` | tak | Rok (np. `2026`) |
| `month` | tak | Miesiąc 1–12 |
| `walletId` | nie | Filtr po portfelu (join na pozycje) |

Odpowiedź (jak `GET /api/transactions/stats` w zakresie miesiąca):

```json
{
  "income": 0.00,
  "expenses": 0.00,
  "balance": 0.00,
  "unclassifiedCount": 0
}
```

Implementacja: `ReportController`, `MonthlyReportQuery`, `TransactionRepository::getPeriodStats()` z filtrami dat i opcjonalnym `walletId`.

### Frontend

- Layout: `ReportsLayout.tsx` — zakładki (`/raporty` → redirect na `/raporty/miesieczny`).
- Strona: `MonthlyReport.tsx` — wybór roku, miesiąca i portfela; stan synchronizowany z URL (ADR-025).

Przykład: `/app/raporty/miesieczny?year=2026&month=6&walletId=2`

---

## Co działa dziś (poza raportem miesięcznym)

### API: `GET /api/transactions/stats`

Parametry opcjonalne: `dateFrom`, `dateTo` (format daty akceptowany przez `DateTimeImmutable`).

Odpowiedź:

```json
{
  "income": 0.00,
  "expenses": 0.00,
  "balance": 0.00,
  "unclassifiedCount": 0
}
```

Implementacja: `TransactionRepository::getPeriodStats()`.

| Pole | Obliczenie |
|------|------------|
| `income` | Suma `amount_minor` gdzie `direction = INCOME` |
| `expenses` | Suma `ABS(amount_minor)` gdzie `direction = EXPENSE` |
| `balance` | `income - expenses` (w PLN, zaokrąglenie 2 miejsca) |
| `unclassifiedCount` | Liczba transakcji ze `status = UNCLASSIFIED` w zakresie dat |

**Uwaga:** Statystyki operują na poziomie **transakcji**, nie pozycji (`transaction_items`). Filtr `walletId` w raporcie miesięcznym działa przez join na pozycje.

### Frontend: Dashboard (`/`)

Wyświetla cztery karty:

- Przychody (`stats.income`)
- Wydatki (`stats.expenses`)
- Saldo (`stats.balance`) — kolor zależny od znaku
- Niesklasyfikowane (`stats.unclassifiedCount`)

Dodatkowo: tabela ostatnich transakcji (`fetchTransactions` z limitem).

Wywołanie: `fetchTransactionStats({ month })` — domyślnie bieżący miesiąc; URL dashboardu: `/?month=YYYY-MM`.

---

## Lista i filtrowanie transakcji (analityka operacyjna)

`GET /api/transactions` z filtrami:

- Zakres dat, kierunek, status klasyfikacji
- Podmioty paid from / paid to
- Portfel, obszar, kategoria (przez join na pozycje)
- Kwota min/max (wartość bezwzględna)
- Opis transakcji (wyszukiwanie częściowe, bez rozróżniania wielkości liter)
- Sortowanie: `date` lub `amount`, kierunek `asc`/`desc`
- Paginacja: `page`, `perPage` (max 100)

Stan filtrów synchronizowany z URL na stronie transakcji (ADR-025).

---

## Czego brakuje

- Zestawienia wg kategorii / obszarów (agregaty na poziomie pozycji)
- Raport roczny, wykresy trendów
- Eksport danych (PDF, CSV)
- Budżet vs wykonanie

Wymagania produktowe: [open-questions.md](open-questions.md) (#19).

---

## Kierunki architektoniczne (przyszłość)

1. **Agregacje na poziomie pozycji** — wiele raportów domowych wymaga sum per `category_id` / `wallet_id` / `concern_id` z `transaction_items`.
2. **Rozszerzenie modułu Reporting** — kolejne endpointy `/api/reports/...` z DTO query (jak `MonthlyReportQuery`).
3. **Materialized views / cache** — przy większej liczbie transakcji agregaty czasowe mogą wymagać optymalizacji.
