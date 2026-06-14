# Moduły i warstwy aplikacji

Konwencje warstw i reguły kodu: [`architecture-rules.md`](architecture-rules.md).

## Backend (`backend/src/`)

### System

| Plik | Route | Opis |
|------|-------|------|
| `System/Controller/HealthController.php` | `GET /api/health` | Status aplikacji (publiczny) |

### Identity

| Plik | Route | Opis |
|------|-------|------|
| `Identity/Controller/AuthController.php` | `/api/auth/*` | Login, logout, profil, lista użytkowników do logowania |
| `Identity/Security/ApiTokenAuthenticator.php` | — | Bearer token z `User.api_token` |
| `Identity/Command/CreateAdminCommand.php` | CLI `app:create-admin` | Tworzenie admina z konsoli |

### Settings

| Plik | Route | Opis |
|------|-------|------|
| `Settings/Controller/UserController.php` | `/api/users/*` | CRUD użytkowników (ROLE_ADMIN) |

### Home — Configuration

| Kontroler | Route base | Encja |
|-----------|------------|-------|
| `PartyController` | `/api/parties` | Party |
| `PartyBankAccountController` | `/api/party-bank-accounts` | PartyBankAccount |
| `WalletController` | `/api/wallets` | Wallet |
| `ConcernController` | `/api/concerns` | Concern |
| `CategoryController` | `/api/categories` | Category |

Wzorzec CRUD: GET list/show, POST create, PUT update, DELETE → `active = false`.

### Home — Import

| Plik | Opis |
|------|------|
| `Import/Controller/CsvImportController.php` | Upload, lista, błędy, wiersze, trigger importu, delete |
| `Import/Service/CsvImportService.php` | Orkiestracja parsowania i walidacji |
| `Import/Provider/MbankCsvImportProvider.php` | Parser mBank (`MBANK`) |
| `Import/Provider/BankImportProviderRegistry.php` | Rejestr providerów (tag Symfony `app.bank_import_provider`) |
| `Import/DTO/*` | `ImportResult`, `ImportRowData`, `ImportErrorData` |

### Home — Transaction

| Plik | Opis |
|------|------|
| `Transaction/Controller/TransactionController.php` | Lista, stats, klasyfikacja, bulk update, historia |
| `Transaction/Service/TransactionClassificationService.php` | Klasyfikacja pojedynczej transakcji |
| `Transaction/Service/TransactionBulkUpdateService.php` | Masowa aktualizacja pól |
| `Transaction/Service/TransactionIngestionService.php` | Tworzenie transakcji z wierszy CSV (auto Skąd/Dokąd) |
| `Transaction/Service/TransactionStatusCalculator.php` | Wspólna logika statusu klasyfikacji |
| `Transaction/Service/TransactionPartyAssignmentValidator.php` | Walidacja Skąd/Dokąd wg reguł kontekstowych (ADR-017) |
| `Transaction/Service/TransactionSnapshotLogService.php` | Snapshoty i historia |
| `Transaction/Repository/TransactionRepository.php` | `findPaged`, `getStats`, `findDuplicate` |

**Planowane (ADR-019):** `POST /api/transactions` — tworzenie transakcji ręcznych (`source: MANUAL`); brak implementacji.

### Repozytoria

Wszystkie w `*/Repository/`, dziedziczą `ServiceEntityRepository`. Custom queries tylko w:

- `TransactionRepository`
- `TransactionChangeLogRepository`
- `UserRepository` (`save`, `upgradePassword`)

### Brak warstwy Form/Request

Kontrolery dekodują JSON inline (`json_decode($request->getContent())`) i walidują ręcznie. Wyjątek: upload CSV jako `multipart/form-data`.

---

## Frontend (`frontend/src/`)

### `app/` — bootstrap

- `main.tsx` — root, providery
- `App.tsx` — bramka auth
- `routes.tsx` — definicja tras
- `providers/AuthProvider.tsx`, `ThemeProvider.tsx`

### `layout/` — szkielet UI

`Layout`, `Sidebar`, `Topbar`, `Breadcrumbs`, `PageHeader`, `RightPanelContext` (portal na panel boczny).

### `shared/` — współdzielone

| Katalog | Zawartość |
|---------|-----------|
| `api/` | Klient Axios + moduły endpointów (10 plików) |
| `components/` | Avatar, Pagination, StatusBadge, ConfirmDialog, ComingSoon |
| `types/` | `Transaction`, `FlowItem`, typy auth |
| `utils/format.ts` | Formatowanie kwot |

### `domains/home/` — domena „Dom”

| Moduł | Ścieżka | Strony / komponenty |
|-------|---------|---------------------|
| dashboard | `dashboard/pages/Dashboard.tsx` | Karty statystyk, ostatnie transakcje |
| transactions | `transactions/` | `Transactions.tsx`, sidebar, edycja single/bulk, historia |
| import | `import/pages/` | Upload, historia, szczegóły, błędy, wiersze |
| configuration | `configuration/` | Podmioty, portfele, dotyczy, kategorie |

### `domains/settings/` — ustawienia

`MyAccount`, `Settings` (zakładki użytkownicy/system), `Users`, `UserForm`.

---

## Mapowanie frontend → API

| Moduł FE | Plik API | Backend |
|----------|----------|---------|
| Auth | `shared/api/auth.ts` | `AuthController` |
| Transakcje | `shared/api/transactions.ts` | `TransactionController` |
| Import | `shared/api/csvImports.ts` | `CsvImportController` |
| Podmioty | `shared/api/parties.ts` | `PartyController` |
| Rachunki | `shared/api/partyBankAccounts.ts` | `PartyBankAccountController` |
| Portfele | `shared/api/wallets.ts` | `WalletController` |
| Dotyczy | `shared/api/concerns.ts` | `ConcernController` |
| Kategorie | `shared/api/categories.ts` | `CategoryController` |
| Użytkownicy | `shared/api/users.ts` | `UserController` |

---

## Bezpieczeństwo (access_control)

| Ścieżka | Dostęp |
|---------|--------|
| `/api/health`, `/api/auth/login`, `/api/auth/login-options` | Publiczny |
| `/api/users/*` | `ROLE_ADMIN` |
| Pozostałe `/api/*` | Zalogowany (Bearer token) |

---

## Requesty API — kształt payloadów

### Klasyfikacja transakcji — `PUT /api/transactions/{id}/items`

```json
{
  "paidFromPartyId": 1,
  "paidToPartyId": 2,
  "items": [
    {
      "amount": 100.50,
      "description": "opcjonalnie",
      "walletId": 1,
      "concernId": 2,
      "categoryId": 3
    }
  ]
}
```

### Bulk update — `PUT /api/transactions/bulk-update`

```json
{
  "transactionIds": [1, 2, 3],
  "fields": ["walletId", "categoryId"],
  "values": {
    "walletId": 1,
    "categoryId": 5
  }
}
```

Dozwolone `fields`: `paidFromPartyId`, `paidToPartyId`, `walletId`, `concernId`, `categoryId`. Wartość `null` czyści pole.

### Encje konfiguracyjne — POST/PUT

Typowy kształt (camelCase w JSON):

- **Party:** `name`, `type`, `ownershipType`, `usageType`, `description`, `active`
- **PartyBankAccount:** `partyId`, `accountNumber`, `bankName`, `displayName`, `ownerNameFromBank`, `currency`, `active`
- **Wallet / Concern:** `name`, `description`, `active`
- **Category:** `name`, `type`, `parentId`, `description`, `active`

### Upload CSV — `POST /api/csv-imports`

`multipart/form-data`: pola `source` (kod providera, np. `MBANK`), `file` (plik CSV).

### Auth — `POST /api/auth/login`

```json
{ "email": "...", "password": "..." }
```

---

## Komponenty transakcji (frontend) — odpowiedzialności

| Komponent | Rola |
|-----------|------|
| `Transactions.tsx` | Tabela, selekcja, orchestracja panelu |
| `TransactionsSidebar` | Zakładki Filtry / Szczegóły / Edycja |
| `EditSinglePanel` | Podział pozycji, klasyfikacja |
| `EditBulkPanel` | Masowa edycja wybranych pól |
| `TransactionHistorySection` | Lista snapshotów, restore |
| `useFlowsQuery` | Pobieranie listy z anulowaniem requestów |

---

## Inne katalogi repozytorium

| Katalog | Status |
|---------|--------|
| `mock/` | Statyczne prototypy HTML; **nie podłączone** do React |
| `scripts/` | Skrypty pomocnicze (np. portproxy) |
| `docker/` | Konfiguracja kontenera |

## Martwy kod (DO POTWIERDZENIA czy usunąć)

- `frontend/.../FilterDrawer.tsx` — brak importów
- `frontend/.../mockData.ts` — brak importów
