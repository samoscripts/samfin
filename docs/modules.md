# Moduły i warstwy aplikacji

Konwencje warstw i reguły kodu: [`architecture-rules.md`](architecture-rules.md).

## Backend (`backend/src/`)

### System

| Plik | Route | Opis |
|------|-------|------|
| `System/Controller/HealthController.php` | `GET /api/health` | Status aplikacji (publiczny); odpowiedź przez `AppInfoProvider`: `status`, `version`, `build`, `commit`, `environment`, `debug`, `profilerUrl` (dev) |

### Identity

| Plik | Route | Opis |
|------|-------|------|
| `Identity/Controller/AuthController.php` | `/api/auth/*` | Login (nowy token + opcj. `clientName`), logout (tylko bieżący token), profil |
| `Identity/Service/ApiTokenService.php` | — | Wydawanie / unieważnianie tokenów `user_api_token` |
| `Identity/Entity/UserApiToken.php` | — | Token API powiązany z użytkownikiem |
| `Identity/Security/ApiTokenAuthenticator.php` | — | Bearer token z `user_api_token` |
| `Identity/Command/CreateAdminCommand.php` | CLI `app:create-admin` | Tworzenie admina z konsoli |

### Settings

| Plik | Route | Opis |
|------|-------|------|
| `Settings/Controller/UserController.php` | `/api/users/*` | CRUD użytkowników (ROLE_ADMIN) |
| `Settings/Controller/SystemController.php` | `/api/system/transactions/*` | Eksport/wyczyszczenie transakcji (ROLE_ADMIN) |
| `Settings/Controller/DatabaseBackupController.php` | `/api/system/backups/*` | Kopie zapasowe DB: lista, utwórz, pobierz, usuń, restore (ROLE_ADMIN) |
| `Settings/Service/DatabaseBackupService.php` | — | mysqldump/mysql, ZIP+manifest, pre-restore, walidacja schematu |
| `Settings/Command/DatabaseBackupCommand.php` | CLI `app:database:backup` | Kopia na żądanie / cron |
| `Settings/Command/DatabaseRestoreCommand.php` | CLI `app:database:restore` | Restore awaryjny bez HTTP |

### Home — Configuration

| Kontroler | Route base | Encja |
|-----------|------------|-------|
| `PartyController` | `/api/parties` | Party |
| `ClassificationRuleController` | `/api/parties/{partyId}/classification-rules` | ClassificationRule (CRUD per podmiot) |
| `ClassificationRulesController` | `GET /api/classification-rules` | Lista wszystkich aktywnych reguł (wszystkie podmioty) |
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
| `Transaction/Controller/TransactionController.php` | Lista, tworzenie ręczne, stats, klasyfikacja, bulk update, historia, apply reguł, **usuwanie** |
| `Transaction/Controller/TransactionTemplateController.php` | `GET/POST/DELETE /api/transaction-templates` — szablony klasyfikacji per użytkownik (`?direction=INCOME\|EXPENSE`) |
| `Transaction/Service/TransactionClassificationService.php` | Klasyfikacja pojedynczej transakcji |
| `Transaction/Service/TransactionBulkUpdateService.php` | Masowa aktualizacja pól |
| `Transaction/Service/TransactionCreateService.php` | Tworzenie transakcji ręcznych (`source: MANUAL`) |
| `Transaction/Service/TransactionDeleteService.php` | Usunięcie transakcji: snapshot do `transactions_trash`, hard DELETE, `markDirty` rozliczeń |
| `Transaction/Service/TransactionIngestionService.php` | Tworzenie transakcji z wierszy CSV (auto Skąd/Dokąd); reimport używa `TransactionDeleteService` |
| `Transaction/Service/TransactionStatusCalculator.php` | Wspólna logika statusu klasyfikacji |
| `Transaction/Service/TransactionPartyAssignmentValidator.php` | Walidacja Skąd/Dokąd wg reguł kontekstowych (ADR-017) |
| `Transaction/Service/TransactionSnapshotLogService.php` | Snapshoty i historia |
| `Transaction/ClassificationRule/*` | Reguły auto-klasyfikacji per party |
| `Transaction/Repository/TransactionRepository.php` | `findPaged`, `getPeriodStats`, `findDuplicate` |

**Tworzenie ręczne (ADR-019):** `POST /api/transactions` — `TransactionCreateService`; UI w sidebarze listy (`?tab=create`, prefill z query); legacy `/transactions/new` → redirect.

### Home — Report

| Plik | Route | Opis |
|------|-------|------|
| `Report/Analytics/Controller/AnalyticsController.php` | `GET /api/reports/analytics` | Zestawienie miesięczne (przychody, wydatki, saldo) |
| `Report/Settlement/Controller/SettlementController.php` | `GET /api/reports/settlements` | Raport rozliczenia wpłat |
| `Report/Settlement/Controller/SettlementController.php` | `GET/PUT /api/reports/settlements/config` | Konfiguracja rozliczenia per użytkownik |
| `Report/Settlement/Service/SettlementService.php` | — | Logika obliczeń rozliczenia |
| `Report/Settlement/Entity/SettlementConfig.php` | — | Encja konfiguracji (`settlement_config`) |

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

`Layout`, `Sidebar`, `Topbar`, `Breadcrumbs`, `PageHeader`, `AppFooter` (wersja/build z `/api/health`), `RightPanelContext` (portal na panel boczny).

### `shared/` — współdzielone

| Katalog | Zawartość |
|---------|-----------|
| `api/` | Klient Axios (`client.ts`) + moduły endpointów (`auth`, `transactions`, `parties`, `classificationRules`, `system`, …) |
| `components/` | `Pill`, `Pagination`, `ConfirmDialog`, `Modal`, `ComingSoon`, `ListTextTooltip`, `ExpandableText`, form kit (`FormField`, `FormError`, `FormActions`, `DictionarySelect`, `CategorySelect`, `formClasses`, `Select`) |
| `hooks/` | `useAppInfo` — dane wersji z health API |
| `constants/` | `pillMaps.ts` — mapowanie wariantów `Pill` (kierunek, status, typ podmiotu) |
| `types/` | `Transaction`, `FlowItem`, typy auth |
| `utils/format.ts` | Formatowanie kwot |
| `utils/errors.ts` | `getApiErrorMessage` — wspólne wyciąganie błędów API |

### `domains/home/` — domena „Dom”

| Moduł | Ścieżka | Strony / komponenty |
|-------|---------|---------------------|
| dashboard | `dashboard/pages/Dashboard.tsx` | Karty statystyk, ostatnie transakcje |
| transactions | `transactions/` | `Transactions.tsx`, sidebar (filtry/szczegóły/edycja/tworzenie), redirecty legacy URL |
| import | `import/pages/` | Upload, historia, szczegóły, błędy, wiersze |
| configuration | `configuration/` | Podmioty, portfele, dotyczy, kategorie, reguły klasyfikacji |

### `domains/settings/` — ustawienia

`MyAccount`, `Settings` (zakładki użytkownicy/system), `Users`, `UserForm`.

### `frontend/src/mobile/` — aplikacja Android (Capacitor)

Logika uruchamiana tylko gdy `isNativeApp()` (`Capacitor.isNativePlatform()`).

| Plik | Rola |
|------|------|
| `platform.ts` | Wykrywanie platformy native |
| `tokenStorage.ts` | Token API w `@capacitor/preferences` + cache RAM (interceptor axios) |
| `pinAuth.ts` | Hash PIN (SHA-256 + salt) w Preferences |
| `biometric.ts` | Opcjonalne odblokowanie odciskiem (`@capgo/capacitor-native-biometric`) |
| `csvIntent.ts` | Wrapper pluginu `CsvIntent` (pending file, base64) |
| `consumeIncomingCsv.ts` | Odczyt pliku z intentu → `File` + `source: MBANK` |
| `IncomingCsvHandler.tsx` | Po loginie / unlock: nawigacja na `/import/nowy` |
| `AppLockScreen.tsx` | Ekran PIN / biometria |

**Bramka w `App.tsx`:** native + token bez unlock → `AppLockScreen`; po unlock → trasy + `IncomingCsvHandler`.

**Plugin natywny:** `mobile/android/.../CsvIntentPlugin.java` — `ACTION_VIEW` na CSV (`text/csv`, `text/plain`, …); plik w cache apki do odczytu przez JS.

**Auth (multi-token):** `POST /api/auth/login` przyjmuje opcjonalne `clientName` (np. `mobile`); tworzy wiersz `user_api_token`. `POST /api/auth/logout` unieważnia **tylko** token z nagłówka `Authorization: Bearer` (nie wszystkie sesje użytkownika). Zmiana hasła (`PUT /api/auth/me`) unieważnia wszystkie tokeny użytkownika.

Szczegóły buildu APK i testów: [`mobile/README.md`](../mobile/README.md).

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
| Reguły klasyfikacji | `shared/api/classificationRules.ts` | `ClassificationRuleController`, `ClassificationRulesController` |
| System (admin) | `shared/api/system.ts` | `SystemController` |
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

### Usuwanie transakcji — `DELETE /api/transactions/{id}`

Brak body. Odpowiedź `204 No Content`. `404` gdy transakcja nie istnieje. Przed usunięciem snapshot w `transactions_trash`.

### Apply reguł — `POST /api/transactions/apply-classification-rules`

```json
{
  "transactionIds": [1, 2, 3],
  "filters": null,
  "overwrite": false
}
```

Lub `filters` (jak lista transakcji) zamiast `transactionIds`. Odpowiedź: `{ applied, skipped, noPartyContext, errors }`.

### Reguły klasyfikacji

**Lista globalna:** `GET /api/classification-rules` — wszystkie aktywne reguły (z `partyId`, `partyName`).

**CRUD per podmiot:** `/api/parties/{partyId}/classification-rules`

Body zawiera `name`, `description`, `priority`, `enabled`, `stopOnMatch`, `conditions`, `actions`, opcjonalnie `partyId` (przeniesienie), `createdFromTransactionId`.

**Podmioty kontekstu reguł:** `GET /api/parties?ruleEligible=true` — OWN + konto bankowe + co najmniej jeden import (używane w UI reguł i przy „Utwórz regułę z transakcji”).

### Encje konfiguracyjne — POST/PUT

Typowy kształt (camelCase w JSON):

- **Party:** `name`, `type`, `ownershipType`, `usageType`, `description`, `active`
- **PartyBankAccount:** `partyId`, `accountNumber`, `bankName`, `displayName`, `ownerNameFromBank`, `currency`, `active`
- **Wallet / Concern:** `name`, `description`, `active`
- **Category:** `name`, `directions` (`EXPENSE` / `INCOME`, min. 1), `parentId`, `description`, `active`
- **Category merge:** `POST /api/categories/merge` — `{ sourceId, targetId }` (tylko subkategorie; przepina pozycje transakcji, szablony, reguły; dezaktywuje źródło)
- **Category deactivation guard:** `DELETE /api/categories/{id}` i `PUT active=false` zwracają `422` z `usage`, gdy kategoria jest używana w tych samych miejscach co merge (`CategoryUsageService`, `CategoryRuleReferenceSupport`)
- **Category UI:** `Categories.tsx` + `CategoriesSidebar` (portal prawego panelu, `?panel=create|edit|move|merge&id=`); `formatCategoryDeactivateError()` w `categories.ts`

### Upload CSV — `POST /api/csv-imports`

`multipart/form-data`: pola `source` (kod providera, np. `MBANK`), `file` (plik CSV).

### Auth — `POST /api/auth/login`

```json
{ "email": "...", "password": "...", "clientName": "web" }
```

Pole `clientName` opcjonalne (domyślnie `web`) — zapisane w `user_api_token.name` (np. `mobile` z aplikacji Android).

### Auth — `POST /api/auth/logout`

Brak body. Wymaga nagłówka `Authorization: Bearer <token>`. Usuwa tylko ten token z bazy; inne sesje (np. przeglądarka) pozostają aktywne.

---

## Moduł reguł klasyfikacji (frontend)

Ścieżka: `domains/home/configuration/classification-rules/`.

Strona reguł została podzielona z monolitu (~637 linii) na cienką stronę i komponenty domenowe (wzorzec jak `parties/`).

| Plik | Odpowiedzialność |
|------|------------------|
| `pages/ClassificationRules.tsx` | Lista reguł (`view`: list/create/edit), breadcrumb, usuwanie (`ConfirmDialog`); obsługa nawigacji z transakcji (`state.fromTransaction`) |
| `components/ClassificationRulesTable.tsx` | Tabela reguł (desktop) + karty (mobile); priorytet, nazwa, podmiot, liczba warunków, status |
| `components/ClassificationRuleForm.tsx` | Formularz create/edit w content (nie modal); deleguje sekcje do edytorów |
| `components/RuleConditionsEditor.tsx` | Warunki AND (pola, operatory, wartości) |
| `components/RuleConditionValueInput.tsx` | Kontrolka wartości warunku (tekst, data, zakres, lista) |
| `components/RuleActionsEditor.tsx` | Akcje transakcji i pozycji (Skąd/Dokąd, split, portfel, dotyczy, kategoria) |
| `utils/ruleFromTransaction.ts` | `buildRuleDraftFromTransaction`, `canCreateRuleFromTransaction`; warunki: opis (`contains`, wartość ręczna) + opcjonalny NRB |
| `ruleConditionMeta.ts` | Operatory dozwolone per pole, normalizacja i walidacja warunków |
| `constants.ts` | Etykiety pól/operatorów, `defaultForm()` / `ruleToForm()` (bez klas CSS — przeniesione do `shared/components/form/formClasses.ts`) |

**Shared form kit (P1, `shared/components/form/`):**

| Plik | Rola |
|------|------|
| `formClasses.ts` | `configInputCls` / `configSelectCls` (formularze konfiguracji), `inputCls` / `selectCls` (transakcje), `labelCls`, `textareaCls`, przyciski |
| `FormField.tsx` | Etykieta + pole (opcjonalnie `required`) |
| `FormError.tsx` | Banner błędu zapisu |
| `FormActions.tsx` | Submit + Anuluj (`layout`: `row` \| `modal`) |
| `Select.tsx` | Cienki wrapper `<select>` z domyślną klasą |
| `DictionarySelect.tsx` | Select słownikowy `{ id, name }` z opcją pustą |

**Shared UI:**

| Plik | Rola |
|------|------|
| `Modal.tsx` | Overlay dialogowy (portal, backdrop, rozmiary sm/md/lg) |
| `ConfirmDialog.tsx` | Potwierdzenie akcji — oparty na `Modal` |

**P2 (zrobione):** `DictionarySelect` przeniesiony do `shared/components/form/`; używany w `ClassificationRuleForm` (paidFrom/paidTo/portfel) oraz w module transakcji.

**P3 (zrobione):** form kit wdrożony w `PartyForm`, `PartyBankAccountsSection` (pola + `FormError`), `Categories` (`CategoryForm`), `SimpleEntityPage` (`EntityForm` — Portfele, Dotyczy).

**P4 (zrobione):**

| Krok | Zmiana |
|------|--------|
| P4a | `RuleConditionsEditor`, `RuleActionsEditor` — wydzielone z `ClassificationRuleForm` |
| P4b | Pole **Dotyczy** (`concernId`) w akcjach reguły + `fetchConcerns` na stronie |
| P4c | `shared/components/Modal.tsx` — używany w `ConfirmDialog`, `ApplyClassificationRulesDialog` (nie w formularzach CRUD konfiguracji) |
| P4d | `categories/components/CategoryForm.tsx` — formularz wydzielony ze strony |
| P4e | `UserForm` na form kit (`FormField`, `FormError`, `FormActions`) |

**Świadomie odroczone (P5+):** `EntityListPage` scaffold; migracja `TransactionFiltersForm` na `FormField`; react-hook-form / Zod.

**P5 (zrobione):** warunki reguł — operatory zależne od pola, dedykowane kontrolki wartości (`between`, `in`, kierunek, status), walidacja przed zapisem (`ruleConditionMeta.ts`).

**Kolejne kroki refaktoryzacji frontendu:**

1. `EntityListPage` — wspólny scaffold listy dla modułów konfiguracji
2. Rename Flow → Transaction w typach frontendowych (decyzja w [open-questions.md](open-questions.md) #6)

---

## Komponenty transakcji (frontend) — odpowiedzialności

| Komponent | Rola |
|-----------|------|
| `Transactions.tsx` | Tabela, selekcja, orchestracja panelu, nawigacja do edycji / tworzenia reguły |
| `TransactionsSidebar` | Zakładki Filtry / Szczegóły / Edycja (bulk) |
| `TransactionDetailsPanel` | Szczegóły pojedynczej transakcji; przyciski Edytuj i Utwórz regułę |
| `TransactionSummaryCard` | Karta transakcji (szczegóły + formularz reguły z transakcji) |
| `TransactionEditForm.tsx` / `TransactionCreateForm.tsx` | Edycja i tworzenie w sidebarze (`?tab=edit&tx=`, `?tab=create`); szablony klasyfikacji (`TransactionTemplateBar`) |
| `EditBulkPanel` | Masowa edycja wybranych pól (sidebar) |
| `ApplyClassificationRulesDialog` | Potwierdzenie zastosowania reguł (zaznaczenie / filtr) |
| `TransactionMultiDetailsPanel` | Szczegóły wielu zaznaczonych transakcji |
| `TransactionHistorySection` | Lista snapshotów, restore |
| `useFlowsQuery` | Pobieranie listy z anulowaniem requestów |

---

## Inne katalogi repozytorium

| Katalog | Status |
|---------|--------|
| `mobile/` | Aplikacja Android (Capacitor); remote WebView, plugin CSV, app lock — [`mobile/README.md`](../mobile/README.md) |
| `mock/` | Statyczne prototypy HTML; **nie podłączone** do React |
| `scripts/` | Skrypty pomocnicze (np. portproxy) |
| `docker/` | Konfiguracja kontenera |
