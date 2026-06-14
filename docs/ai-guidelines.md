# Wytyczne dla AI i programistów

Dokument opisuje, jak bezpiecznie pracować z kodem SamFin — dla asystentów AI i ludzi.

---

## Zasady ogólne

1. **Nie wymyślaj funkcji** — jeśli nie ma endpointu, encji lub strony w kodzie, oznacz to jako brak lub „DO POTWIERDZENIA”.
2. **Słowniki to dane w tabelach** — nazwy kategorii, portfeli, podmiotów, obszarów są konfigurowalne przez użytkownika. Nie traktuj przykładów z `mock/` jako danych produkcyjnych.
3. **Enumy w kodzie ≠ słowniki użytkownika** — `INCOME`/`EXPENSE`, statusy klasyfikacji, typy podmiotów to stałe systemowe; konkretne rekordy `party`, `category` itd. to dane użytkownika.
4. **Kwoty w groszach** — w PHP/DB zawsze `amount_minor` (int). API i frontend używają decimal PLN; konwersja `round(amount * 100)` przy zapisie.
5. **Soft delete** — `DELETE` w API ustawia `active = false`. Nie zakładaj fizycznego usuwania rekordów konfiguracyjnych.
6. **Minimalny diff** — przy zmianach zachowuj istniejące konwencje (inline JSON validation, `toApiArray()` na encjach, camelCase w API).
7. **Umiejscowienie UI** — formularze create/edit w **page content** lub **sidebar**; **modale** tylko na confirmy i krótkie prompty. Przy nowej funkcji — zapytaj użytkownika (page / sidebar / modal). Szczegóły: [`architecture-rules.md`](architecture-rules.md) (sekcja Frontend).

---

## Gdzie szukać informacji

| Temat | Lokalizacja |
|-------|-------------|
| Model domenowy | [domain-model.md](domain-model.md) |
| Schemat DB | [database.md](database.md) |
| Endpointy | [modules.md](modules.md) |
| Import CSV | [import-csv.md](import-csv.md) |
| Słowniki | [configuration-dictionaries.md](configuration-dictionaries.md) |
| Niespójności | [open-questions.md](open-questions.md) |
| Decyzje | [decisions.md](decisions.md) |

---

## Backend — wzorce

### Namespace i moduły

```
App\Home\Configuration\   — słowniki
App\Home\Import\          — CSV
App\Home\Transaction\     — transakcje
App\Identity\             — auth
App\Settings\             — admin users
App\System\               — health
```

### Dodawanie nowego endpointu

1. Kontroler w odpowiednim `Controller/` z atrybutem `#[Route('/api/...')]`.
2. Logika biznesowa w `Service/` (nie w kontrolerze przy złożonych regułach).
3. Zapytania DB w `Repository/` tylko gdy przekraczają proste `findBy`.
4. Aktualizacja `security.yaml` jeśli wymaga innej roli niż `IS_AUTHENTICATED_FULLY`.
5. Odpowiedź JSON przez `$this->json()` lub `$entity->toApiArray()`.

### Dodawanie encji

1. Klasa w `Entity/` z atrybutami Doctrine.
2. `Repository/` extends `ServiceEntityRepository`.
3. Migracja: `php bin/console doctrine:migrations:diff` (w kontenerze).
4. Konwencja FK: `fk_{table}_{column}` (patrz istniejące migracje).

### Import nowego banku

Implementuj `BankImportProviderInterface`, tag `app.bank_import_provider`. Wzorzec: `MbankCsvImportProvider.php`.

---

## Frontend — wzorce

### Struktura

- Nowe funkcje „Dom” → `domains/home/<feature>/`
- API → `shared/api/<nazwa>.ts`
- Typy współdzielone → `shared/types/`
- Alias importów: `@/` → `src/`

### Pobieranie danych

Brak React Query — wzorzec `useState` + `useEffect` lub dedykowany hook (np. `useFlowsQuery` z `AbortController`).

### Auth

Token w `localStorage.samfin_token`. Klient Axios (`shared/api/client.ts`) dołącza nagłówek Bearer.

### Routing

`basename="/app"` — ścieżki w `routes.tsx` bez prefiksu `/app` (Router dodaje automatycznie).

---

## Reguły biznesowe — checklist przy zmianach transakcji

Przy modyfikacji klasyfikacji lub importu sprawdź:

- [ ] Suma pozycji = kwota transakcji (1–5 pozycji)
- [ ] Status przez `TransactionStatusCalculator` (klasyfikacja, bulk update, import CSV)
- [ ] Skąd/Dokąd: reguły kontekstowe (`TransactionPartyAssignmentValidator`, `partyAssignment.ts`); Skąd ≠ Dokąd
- [ ] Bulk update: jeden `direction` dla wszystkich ID
- [ ] Bulk update: `category.type` === `transaction.direction`
- [ ] Import: duplikat po party + date + amount + description
- [ ] Import: EXPENSE → `paid_from`, INCOME → `paid_to` z `csv_import.party`
- [ ] Historia: czy zmiana powinna wołać `TransactionSnapshotLogService`?

---

## Czego nie robić bez potwierdzenia

- Dodawanie encji „budżet”, „cel”, „beneficjent” — brak w modelu
- Seedowanie słowników kategorii/portfeli w migracjach
- Hardcodowanie nazw kategorii w logice biznesowej
- Refaktoryzacja `Flow` → `Transaction` w całym FE bez uzgodnienia
- Zmiana konwencji kwot (float w DB)
- Force push / zmiany migracji już wdrożonych na produkcji

---

## Komendy przydatne w dev

```bash
make up              # Docker
make migrate         # Migracje DB
make shell           # Bash w kontenerze PHP
make sf CMD="debug:router"   # Lista tras
make npm CMD="run build"     # Build frontendu
```

Health check: `GET http://localhost:3001/api/health`

---

## Dokumentowanie zmian

Po istotnych zmianach architektonicznych:

1. Zaktualizuj odpowiedni plik w `docs/`.
2. Nowe decyzje → [decisions.md](decisions.md) z datą i statusem.
3. Nowe wątpliwości → [open-questions.md](open-questions.md).

---

## Kontekst dla promptów AI

Przykładowy prefix przy zadaniach w SamFin:

> Projekt: SamFin — budżet domowy, Symfony 7 + React. Kwoty w groszach. Klasyfikacja: Skąd/Dokąd + portfel + dotyczy + kategoria. Reguły Skąd/Dokąd kontekstowe (import vs ręcznie, bez direction_usage_*). Import CSV dwuetapowy (mBank). Przeczytaj docs/ przed zmianami.
