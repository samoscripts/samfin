# Raportowanie i analityka

## Stan implementacji

Moduł raportów **nie jest zaimplementowany**. W aplikacji istnieją wyłącznie:

1. **Placeholder UI** — strona `/app/raporty` renderuje komponent `ComingSoon` z tytułem „Raporty” i podtytułem „Analizy i zestawienia finansowe”.
2. **Podstawowe statystyki transakcji** — endpoint API i dashboard.

Folder `mock/` zawiera statyczne prototypy HTML (`mock/js/przeplywy.js`) z przykładowymi zestawieniami — **nie są podłączone** do aplikacji React.

---

## Co działa dziś

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

Implementacja: `TransactionRepository::getStats()`.

| Pole | Obliczenie |
|------|------------|
| `income` | Suma `amount_minor` gdzie `direction = INCOME` |
| `expenses` | Suma `ABS(amount_minor)` gdzie `direction = EXPENSE` |
| `balance` | `income - expenses` (w PLN, zaokrąglenie 2 miejsca) |
| `unclassifiedCount` | Liczba transakcji ze `status = UNCLASSIFIED` w zakresie dat |

**Uwaga:** Statystyki operują na poziomie **transakcji**, nie pozycji (`transaction_items`). Nie uwzględniają wymiarów portfel / obszar / kategoria.

### Frontend: Dashboard (`/`)

Wyświetla cztery karty:

- Przychody (`stats.income`)
- Wydatki (`stats.expenses`)
- Saldo (`stats.balance`) — kolor zależny od znaku
- Niesklasyfikowane (`stats.unclassifiedCount`)

Dodatkowo: tabela ostatnich transakcji (`fetchTransactions` z limitem).

Wywołanie: `fetchTransactionStats()` bez filtrów datowych (cała historia).

---

## Lista i filtrowanie transakcji (nie raport, ale analityka operacyjna)

`GET /api/transactions` z filtrami:

- Zakres dat, kierunek, status klasyfikacji
- Podmioty paid from / paid to
- Portfel, obszar, kategoria (przez join na pozycje)
- Kwota min/max (wartość bezwzględna)
- Sortowanie: `date` lub `amount`, kierunek `asc`/`desc`
- Paginacja: `page`, `perPage` (max 100)

To umożliwia eksplorację danych w UI transakcji, ale **nie generuje raportów** (PDF, wykresy, zestawienia okresowe per kategoria itd.).

---

## Czego brakuje (planowane wg UI, nie w kodzie)

Na podstawie placeholdera `/raporty` i prototypów `mock/` można **domyślać się** planowanych funkcji, ale **nie są one w kodzie produkcyjnym**:

- Zestawienia wg kategorii / portfeli / obszarów
- Raporty okresowe (miesiąc, rok)
- Wykresy trendów
- Eksport danych

Wszelkie przyszłe wymagania raportowe wymagają potwierdzenia z product ownerem — patrz [open-questions.md](open-questions.md).

---

## Propozycje architektoniczne (DO POTWIERDZENIA)

Poniższe nie wynikają z istniejącego kodu — to kierunki do rozważenia przy implementacji raportów:

1. **Agregacje na poziomie pozycji** — wiele raportów domowych wymaga sum per `category_id` / `wallet_id` / `concern_id` z `transaction_items`, nie z nagłówka transakcji.
2. **Osobny moduł Reporting** — endpointy typu `/api/reports/...` vs rozszerzenie `/transactions/stats`.
3. **Materialized views / cache** — przy większej liczbie transakcji agregaty czasowe mogą wymagać optymalizacji.
