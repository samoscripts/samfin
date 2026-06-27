# Wytyczne dla AI i programistów

Dokument opisuje, jak bezpiecznie pracować z kodem SamFin — dla asystentów AI i ludzi.

---

## Zasady ogólne

1. **Nie wymyślaj funkcji** — jeśli nie ma endpointu, encji lub strony w kodzie, oznacz to jako brak lub „DO POTWIERDZENIA”.
2. **Słowniki to dane w tabelach** — nazwy kategorii, portfeli, podmiotów, obszarów są konfigurowalne przez użytkownika. Nie traktuj przykładów z `mock/` jako danych produkcyjnych.
3. **Enumy w kodzie ≠ słowniki użytkownika** — `INCOME`/`EXPENSE`, statusy klasyfikacji, typy podmiotów to stałe systemowe; konkretne rekordy `party`, `category` itd. to dane użytkownika.
4. **Kwoty w groszach** — w PHP/DB zawsze `amount_minor` (int). API i frontend używają decimal PLN; konwersja `round(amount * 100)` przy zapisie.
5. **Soft delete** — `DELETE` w API ustawia zwykle `active = false`. Nie zakładaj fizycznego usuwania rekordów konfiguracyjnych. **Wyjątek:** kategorie z potwierdzonymi użyciami — dezaktywacja zablokowana (`ADR-027`); merge przepina referencje.
6. **Minimalny diff** — przy zmianach zachowuj istniejące konwencje (inline JSON validation, `toApiArray()` na encjach, camelCase w API).
7. **Umiejscowienie UI** — formularze create/edit w **page content** lub **sidebar**; **modale** tylko na confirmy i krótkie prompty. Przy nowej funkcji — zapytaj użytkownika (page / sidebar / modal). Szczegóły: [`architecture-rules.md`](architecture-rules.md) (sekcja Frontend).
8. **Pole kategorii** — w formularzach klasyfikacji używaj `CategorySelect` (`frontend/src/shared/components/form/CategorySelect.tsx`), nie `DictionarySelect`. Szczegóły: `.cursor/rules/frontend-form-fields.mdc`.
9. **Dokumentacja przy większych zmianach** — w tym samym zadaniu zaktualizuj `docs/` (ADR, słowniki, moduły). Szczegóły: sekcja „Dokumentowanie zmian” poniżej oraz `.cursor/rules/docs-sync.mdc`.

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
2. **Download plików:** `StreamedResponse` + jawny `Content-Type` (patrz `SystemController`, `DatabaseBackupController`) — nie `BinaryFileResponse` bez `symfony/mime` w `require`. Zasada prod: `.cursor/rules/backend-composer-prod.mdc`.
3. Logika biznesowa w `Service/` (nie w kontrolerze przy złożonych regułach).
4. Zapytania DB w `Repository/` tylko gdy przekraczają proste `findBy`.
5. Aktualizacja `security.yaml` jeśli wymaga innej roli niż `IS_AUTHENTICATED_FULLY`.
6. Odpowiedź JSON przez `$this->json()` lub `$entity->toApiArray()`.

### Dodawanie encji

1. Klasa w `Entity/` z atrybutami Doctrine.
2. `Repository/` extends `ServiceEntityRepository`.
3. Migracja: `doctrine:migrations:diff` w kontenerze → `make migrate`. Konwencja nazw: [database.md — Reguły nazewnictwa migracji](database.md#reguły-nazewnictwa-migracji) (plik `Version…` + `fk_{tabela}_{kolumna}`).

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

### Padding stron

`Layout` renderuje `<Outlet />` bez paddingu. Strony **bezpośrednio** pod `Layout` (np. `TransactionEdit`, `Dashboard`) owijają content w `p-4 md:p-6 max-w-screen-xl`. Strony pod layoutem modułu (`Configuration`, `ImportLayout`) dostają padding od rodzica — nie duplikować. Szczegóły: `.cursor/rules/frontend-page-padding.mdc`.

---

## Reguły biznesowe — checklist przy zmianach transakcji

Przy modyfikacji klasyfikacji lub importu sprawdź:

- [ ] Suma pozycji = kwota transakcji (1–5 pozycji)
- [ ] Status przez `TransactionStatusCalculator` (klasyfikacja, bulk update, import CSV)
- [ ] Skąd/Dokąd: reguły kontekstowe (`TransactionPartyAssignmentValidator`, `partyAssignment.ts`); Skąd ≠ Dokąd
- [ ] Bulk update: jeden `direction` dla wszystkich ID
- [ ] Bulk update: kategoria `directions` zawiera `transaction.direction`
- [ ] Kategoria CRUD: `directions` min. 1 element; parent obsługuje wszystkie kierunki dziecka
- [ ] Dezaktywacja kategorii: blokada przy użyciu w pozycjach transakcji, szablonach lub regułach (`CategoryUsageService`, ADR-027); merge przepina referencje
- [ ] Import: duplikat po party + date + amount + trans_title/description (canonical_text)
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
make migrate         # Migracje DB (w kontenerze, użytkownik www-data)
make shell           # Bash w kontenerze PHP
make sf CMD="debug:router"   # Lista tras
make test            # PHPUnit (APP_ENV=test)
make test-db-setup   # Jednorazowo: baza samfin_test + migracje
make npm CMD="run build"     # Build frontendu
```

Migracje ręcznie (gdy `make migrate` niedostępne):

```bash
docker compose exec -u www-data -T app php bin/console doctrine:migrations:migrate --no-interaction
```

**Nie** uruchamiaj migracji na hoście WSL bez kontenera — brak `pdo_mysql`. Szczegóły: [database.md](database.md), reguła `.cursor/rules/docker-migrations.mdc`.

Health check: `GET http://localhost:3001/api/health` — zwraca m.in. `version`, `build`, `commit` (z `backend/config/build_info.json`, generowany przez `frontend/scripts/generate-build-info.mjs` przy `npm run build`).

### Testy (PHPUnit)

Jednorazowo: `make test-db-setup` (baza `samfin_test` + migracje). Potem: `make test`.

**CI:** przy push/PR na `main` — workflow [`.github/workflows/tests.yml`](../.github/workflows/tests.yml) (PHPUnit + migracje na MariaDB 11).

| Katalog | Zakres |
|---------|--------|
| `backend/tests/Smoke/` | health, security (publiczne vs chronione endpointy) |
| `backend/tests/Api/` | testy HTTP kontrolerów (`ApiTestCase`): auth, categories, transactions, parties, wallets, concerns, party-bank-accounts, csv-imports, analytics, settlements, classification-rules, transaction-templates, system/backups |
| `backend/tests/Unit/`, `backend/tests/Home/` | testy jednostkowe serwisów / parserów |

Nowe testy API: dziedzicz z `App\Tests\Support\ApiTestCase`, używaj `createUser()` + `requestJson()`. Izolacja DB: `dama/doctrine-test-bundle` (rollback po każdym teście).

---

## Dokumentowanie zmian

**Większe zmiany w kodzie obejmują aktualizację dokumentacji w tym samym zadaniu** — bez czekania na osobne polecenie. Reguła Cursor: `.cursor/rules/docs-sync.mdc`.

### Kiedy aktualizować (minimum)

| Typ zmiany | Gdzie |
|------------|--------|
| Nowa decyzja / zmiana semantyki API | `decisions.md` (ADR) |
| Słownik, walidacja, blokada dezaktywacji | `configuration-dictionaries.md` |
| Encja, relacje, reguły domenowe | `domain-model.md` |
| Endpoint, serwis, moduł FE/BE | `modules.md` |
| Nierozstrzygnięte zachowanie | `open-questions.md` |
| Checklist dla przyszłych zmian | `ai-guidelines.md` |
| Konwencja UI (formularze, panele) | `.cursor/rules/*.mdc` |

### Po istotnych zmianach architektonicznych

1. Zaktualizuj odpowiedni plik w `docs/` (tabela powyżej).
2. Nowe decyzje → [decisions.md](decisions.md) z datą i statusem.
3. Zamknięte lub doprecyzowane wątpliwości → [open-questions.md](open-questions.md).
4. Nie opisuj w docs zachowań niepotwierdzonych w kodzie.

### Drobnica — docs opcjonalne

Typo, rename bez zmiany semantyki, czysty refactor wewnętrzny bez zmiany API/UX.

---

## Kontekst dla promptów AI

Przykładowy prefix przy zadaniach w SamFin:

> Projekt: SamFin — budżet domowy, Symfony 7 + React. Kwoty w groszach. Klasyfikacja: Skąd/Dokąd + portfel + dotyczy + kategoria. Reguły Skąd/Dokąd kontekstowe (import vs ręcznie, bez direction_usage_*). Import CSV dwuetapowy (mBank). Przeczytaj docs/ przed zmianami. Większe zmiany — aktualizuj docs/ w tym samym zadaniu (`.cursor/rules/docs-sync.mdc`).
