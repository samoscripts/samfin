# Słowniki konfiguracyjne

W SamFin dane referencyjne używane przy klasyfikacji transakcji są **konfigurowalne przez użytkownika** i przechowywane w tabelach bazy. Poniższy opis nie zawiera konkretnych wartości słowników z produkcji — tylko strukturę i semantykę pól.

## Przegląd słowników

| Słownik | Tabela | API | UI |
|---------|--------|-----|-----|
| Podmioty | `party` | `/api/parties` | Konfiguracja → Podmioty |
| Rachunki bankowe | `party_bank_account` | `/api/party-bank-accounts` | Pod sekcją podmiotu |
| Portfele | `wallet` | `/api/wallets` | Konfiguracja → Portfele |
| Obszary (Dotyczy) | `concern` | `/api/concerns` | Konfiguracja → Dotyczy |
| Kategorie | `category` | `/api/categories` | Konfiguracja → Kategorie |

Wszystkie słowniki wspierają **dezaktywację** (`active = false`) zamiast fizycznego usuwania.

---

## Party (podmiot)

**Cel domenowy:** reprezentacja strony przepływu pieniędzy — np. członek rodziny, sklep, konto oszczędnościowe, gotówka w portfelu.

### Pola konfigurowalne

| Pole | Typ | Opis |
|------|-----|------|
| `name` | string(200) | Nazwa wyświetlana |
| `description` | text? | Opis opcjonalny |
| `active` | bool | Czy widoczny/aktywny |

### Pola klasyfikujące (enum w kodzie, wartość per rekord)

| Pole | Dozwolone wartości (stałe PHP) | Znaczenie |
|------|-------------------------------|-----------|
| `type` | PERSON, COMPANY, SHOP, INSTITUTION, ACCOUNT, CASH, OTHER | Rodzaj podmiotu |
| `ownership_type` | OWN, EXTERNAL | Własny vs zewnętrzny |

Etykiety PL w UI: `frontend/.../parties/types.ts` (`PARTY_TYPE_LABELS` itd.).

### Użycie w transakcjach (Skąd / Dokąd)

Reguły kontekstowe (bez flag na podmiocie) — patrz ADR-017 i `TransactionPartyAssignmentValidator`:

| Źródło | Wydatek | Wpływ |
|--------|---------|-------|
| Import CSV | Skąd = OWN+ACCOUNT (read-only) | Dokąd = OWN+ACCOUNT (read-only) |
| Ręcznie | Skąd = OWN+CASH | Dokąd = OWN+CASH |
| Druga strona | dowolny aktywny podmiot | dowolny aktywny podmiot |

Skąd ≠ Dokąd. Frontend: `partyAssignment.ts`.

---

## PartyBankAccount (rachunek bankowy)

**Cel:** powiązanie numeru rachunku z podmiotem; walidacja importu CSV.

| Pole | Opis |
|------|------|
| `party_id` | Właściciel rachunku (FK, RESTRICT) |
| `account_number` | Numer rachunku (porównywany po normalizacji cyfr) |
| `bank_name` | Nazwa banku (opcjonalna) |
| `display_name` | Nazwa wyświetlana |
| `owner_name_from_bank` | Imię/nazwa z wyciągu — do walidacji z nagłówkiem CSV |
| `currency` | Domyślnie PLN |
| `active` | Dezaktywacja |

---

## Wallet (portfel)

**Cel:** kubełek rozliczeniowy pozycji transakcji — kontekst, w którym rozliczamy wydatek/wpływ (np. budżet domowy, salon, firma). **Nie** jest to rachunek bankowy (`Party` + ACCOUNT) ani encja z limitem kwotowym.

| Pole | Opis |
|------|------|
| `name` | Nazwa portfela (np. „Budżet domowy”, „SamSoft”) |
| `description` | Opis opcjonalny |
| `active` | Dezaktywacja |

Przykłady wartości to **dane użytkownika**, nie stałe systemowe. Decyzja domenowa: ADR-018.

---

## Concern (obszar — UI: „Dotyczy”)

**Cel:** kogo lub czego dotyczy wydatek/wpływ (UI: **„Dotyczy”**). Np. Basia, wspólne, Maciek. **Nie** zawiera kwot planowanych ani okresów — to nie jest encja „budżet z limitem” (patrz ADR-P07).

| Pole | Opis |
|------|------|
| `name` | Nazwa obszaru |
| `description` | Opis opcjonalny |
| `active` | Dezaktywacja |

---

## Category (kategoria)

**Cel:** trzeci wymiar klasyfikacji — typ wydatku lub przychodu. Drzewo kategorii przez `parent_id`.

| Pole | Opis |
|------|------|
| `name` | Nazwa kategorii |
| `type` | INCOME lub EXPENSE — musi być zgodne z kierunkiem transakcji przy bulk update |
| `parent_id` | Kategoria nadrzędna (opcjonalna) |
| `description` | Opis opcjonalny |
| `active` | Dezaktywacja |

Konkretne nazwy kategorii (np. „Żywność”, „Zasilenie budżetu”) to **dane użytkownika**, nie stałe systemowe.

---

## Czego nie ma w słownikach (stan kodu)

Następujące koncepcje **nie mają** dedykowanych tabel ani API (Q6):

- Cele oszczędnościowe (goals) — poza MVP
- Beneficjenci jako osobna encja — mapowanie na `concern` („Dotyczy”)
- Zakresy budżetu z kwotami planowanymi — ADR-P07
- Tagi / etykiety poza opisem pozycji

Jeśli te pojęcia są planowane w domenie biznesowej, wymagają nowych encji — patrz [open-questions.md](open-questions.md).

---

## Enumy systemowe (nie są słownikami użytkownika)

Te wartości są **stałymi w kodzie** (nie tabelami konfiguracyjnymi):

| Kontekst | Wartości |
|----------|----------|
| Kierunek transakcji | INCOME, EXPENSE |
| Status klasyfikacji | UNCLASSIFIED, PARTIALLY_CLASSIFIED, CLASSIFIED |
| Źródło transakcji | CSV, MANUAL |
| Status importu CSV | PENDING, VALIDATED, FAILED, IMPORTED |
| Status wiersza CSV | VALIDATED, PARSE_ERROR, DUPLICATE, IMPORTED |
| Rola użytkownika | ADMIN, USER |
| Kod providera importu | MBANK (jedyny zaimplementowany) |

---

## Providerzy banków (import)

Lista dostępnych banków do importu CSV pochodzi z rejestru providerów (`GET /api/csv-imports/providers`), nie z tabeli DB. Obecnie zarejestrowany: **mBank** (`MBANK`).

Dodanie nowego banku = nowa klasa implementująca `BankImportProviderInterface` + tag `app.bank_import_provider`.
