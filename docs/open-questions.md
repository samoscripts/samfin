# Otwarte pytania i niespójności

Dokument zbiera niejasności wynikające z analizy kodu. Wymagają potwierdzenia przez właściciela produktu lub zespół.

**Wywiad 2026-06-13 (Q1–Q8):** rozstrzygnięte w [decisions.md](decisions.md) (ADR-013–019) i zaktualizowanych sekcjach [domain-model.md](domain-model.md), [configuration-dictionaries.md](configuration-dictionaries.md), [import-csv.md](import-csv.md).

| # | Temat | Decyzja |
|---|--------|---------|
| Q1 | Skąd/Dokąd | Reguły kontekstowe (ADR-017); **bez** flag `direction_usage_*` |
| Q2 | Egzekwowanie reguł | Twarda walidacja backend (`TransactionPartyAssignmentValidator`) |
| Q3 | Definicja `CLASSIFIED` | Wszystkie 5 pól: Skąd, Dokąd, portfel, dotyczy, kategoria |
| Q4 | Import CSV | Podmiot z rachunku: wydatek → Skąd, wpływ → Dokąd |
| Q5 | `concern` vs budżet | **A** — `concern` = „Dotyczy” (kogo dotyczy); brak limitów kwotowych |
| Q6 | Beneficjent / cele | Brak osobnej encji; beneficjent → `concern`; cele poza MVP |
| Q7 | Portfel (`wallet`) | **A** — kubełek rozliczeniowy, nie konto bankowe (ADR-018) |
| Q8 | Transakcje ręczne | MVP ADR-019 — **zaimplementowane** (`POST /api/transactions`, `/transactions/new`) |

---

## Semantyka domenowa

### ~~1. Co dokładnie oznacza „CLASSIFIED”?~~ — **ROZWIĄZANE (2026-06-13)**

**Decyzja:** `CLASSIFIED` wymaga **wszystkich pięciu** pól: Skąd + Dokąd + (na każdej pozycji) portfel + dotyczy + kategoria. `UNCLASSIFIED` = żadne pole nie wypełnione. `PARTIALLY_CLASSIFIED` = coś wypełnione, ale nie komplet. Implementacja: `TransactionStatusCalculator`.

### ~~5. Podmioty przy imporcie CSV~~ — **ROZWIĄZANE (2026-06-13)**

**Decyzja:** Przy imporcie ustawiać podmiot z dopasowanego rachunku bankowego: wydatek → Skąd, wpływ → Dokąd. Brak osobnej kolumny w CSV. Implementacja: `TransactionIngestionService`.

### ~~2. Concern („Dotyczy”) vs budżet~~ — **ROZWIĄZANE (2026-06-13)**

**Decyzja (Q5):** `concern` oznacza **kogo/czego dotyczy** transakcja (np. Basia, wspólne, Maciek). Etykieta UI: „Dotyczy”. Słowo „budżet” w starym opisie UI **nie** oznacza osobnej encji z limitami — to kandydat na ADR-P07 (przyszłość).

### ~~3. Cele, beneficjenci, zakresy budżetu~~ — **ROZWIĄZANE (2026-06-13)**

**Decyzja (Q6):** Pojęcie **beneficjenta** mapuje się na `concern` („Dotyczy”). Osobne encje celów i beneficjentów **nie wchodzą do MVP**. Limity budżetowe — osobna decyzja (ADR-P07).

### ~~4. Transakcje ręczne (`SOURCE_MANUAL`)~~ — **ROZWIĄZANE i zaimplementowane**

**Decyzja (Q8):** Tak — ręczne dodawanie w MVP. Pola: kierunek, data, kwota, opis; klasyfikacja opcjonalna przy tworzeniu. Skąd/Dokąd wg ADR-017 (MANUAL: strona własna = OWN+CASH). Szczegóły: **ADR-019**. `POST /api/transactions`, formularz `/transactions/new` z prefill z URL.

---

## Niespójności nazewnictwa

### 6. Transaction vs Flow

- Backend i API: **Transaction**
- Frontend: typy `FlowItem`, `FlowFilters`, hook `useFlowsQuery`

**Pytanie:** Czy ujednolicić na „Transaction” w całym frontendzie?

### 7. Concern vs Dotyczy vs „obszar”

| Miejsce | Termin |
|---------|--------|
| Tabela / encja PHP | `concern` |
| API | `/api/concerns` |
| UI PL | „Dotyczy”, „obszar” |
| Komunikat błędu backendu | „Nie znaleziono obszaru” |

**Pytanie:** Jaka jest docelowa nazwa domenowa po polsku i po angielsku w kodzie?

### 8. Mieszanka języków w UI

Sidebar: „Dashboard”, „Transactions” obok polskich „Raporty”, „Konfiguracja”.

**Pytanie:** Czy docelowy język UI to wyłącznie polski?

### 9. Tabela `transactions` vs `transaction`

Nazwa tabeli `transactions` (liczba mnoga) vs `transaction_items` — niespójność konwencji nazewnictwa tabel.

---

## Zachowanie systemu

### 10. Historia zmian a bulk update

`TransactionSnapshotLogService` jest wywoływany tylko z `TransactionClassificationService` (edycja pojedyncza / restore). **Bulk update nie zapisuje historii.**

**Pytanie:** Czy masowa edycja powinna tworzyć wpisy w `transactions_change_log`?

### 11. Moment snapshotu w historii

Snapshot jest zapisywany **po** klasyfikacji (stan wynikowy), nie przed zmianą.

**Pytanie:** Czy użytkownik oczekuje historii „stanów przed zmianą” do cofania, czy „zapisanych wersji” do przywracania?

### 12. Dezaktywacja słowników a istniejące transakcje

Dezaktywacja portfela/obszaru nie usuwa FK z pozycji — rekordy pozostają powiązane z nieaktywnym słownikiem.

**Kategorie (decyzja 2026-06-24, ADR-027):** zwykła dezaktywacja jest blokowana, gdy kategoria jest używana w `transaction_items`, `transaction_template` lub `classification_rule.actions_json.items`. Scalanie subkategorii przepina te referencje. Snapshoty historii (`transactions_change_log`) pozostają poza zakresem blokady.

**Pytanie (pozostałe słowniki):** Czy filtry i formularze powinny ukrywać nieaktywne wartości, ale pokazywać je na istniejących transakcjach?

### 13. Duplikaty przy imporcie

Duplikat szukany tylko w transakcjach powiązanych z importem tego samego `party` (`join import.party`). Ten sam wyciąg zaimportowany dwukrotnie po usunięciu pierwszego importu może utworzyć duplikaty — **DO POTWIERDZENIA** zachowania przy DELETE importu (blokada 409 dla IMPORTED).

### 14. Waluta

Pole `currency` na rachunku bankowym (domyślnie PLN). Kwoty transakcji nie mają pola waluty.

**Pytanie:** Czy SamFin ma obsługiwać wyłącznie PLN, czy multi-walutowość jest w zakresie?

---

## Techniczne

### 15. Folder `mock/`

Folder prototypów HTML/JS został usunięty z repozytorium. W dokumentacji nie odwoływać się do `mock/` jako źródła prawdy.

### 16. Martwy kod frontendu

`FilterDrawer.tsx`, `mockData.ts` — brak importów.

**Pytanie:** Usunąć czy planowane do użycia?

### 17. Brak testów automatycznych

W repozytorium nie znaleziono testów PHPUnit ani Vitest/Jest dla logiki biznesowej.

**Pytanie:** Jaki jest docelowy poziom pokrycia testami?

### 18. Symfony Validator

Pakiet `symfony/validator` jest w `composer.json`, ale kontrolery walidują ręcznie.

**Pytanie:** Czy planowana jest migracja do DTO + atrybutów walidacji?

---

## Raportowanie

### 19. Zakres modułu Raporty

**Stan:** MVP — raport miesięczny (`/raporty/default/monthly`, `GET /api/reports/monthly`) oraz rozliczenie wpłat na konto wspólne (`/raporty/common-account`, `GET /api/reports/common-account-settlement`). Nawigacja: rozwijane podmenu w Sidebarze; konfiguracja rozliczenia w zakładce wewnątrz widoku konto wspólne.

**Pytanie:** Jakie raporty są kolejnym priorytetem (per kategoria, per portfel szczegółowy, cashflow roczny, budżet vs wykonanie)?

### 20. Stats na dashboardzie bez zakresu dat

**Rozwiązane:** Dashboard domyślnie pokazuje bieżący miesiąc; `?month=YYYY-MM` w URL; API `GET /transactions/stats?month=`.
