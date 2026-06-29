# SamFin Mobile (Android)

Aplikacja Android dla SamFin — opakowuje produkcyjny frontend (`https://fin.samsoft.pl/app/`) w natywną apkę (WebView).  
Kod źródłowy React **nie jest** pakowany w APK — apka ładuje stronę z serwera (model **remote URL**).

> **Dla kogo jest ten dokument?**  
> Instrukcja krok po kroku, jeśli pierwszy raz budujesz aplikację Android.  
> **Zalecany build APK:** WSL (`make mobile-build-apk`) + instalacja `adb` z Windows. Android Studio jest opcjonalne.

---

## Spis treści

1. [Jak to działa (w skrócie)](#jak-to-działa-w-skrocie)
2. [Co jest w którym folderze](#co-jest-w-którym-folderze)
3. [Wymagania — jednorazowa konfiguracja](#wymagania--jednorazowa-konfiguracja)
4. [Pierwsze uruchomienie (Faza 1)](#pierwsze-uruchomienie-faza-1)
5. [Budowanie APK w WSL (zalecane)](#budowanie-apk-w-wsl-zalecane)
6. [Codzienny workflow](#codzienny-workflow)
7. [Android Studio (opcjonalnie)](#android-studio-opcjonalnie)
8. [Instalacja na telefonie (USB)](#instalacja-na-telefonie-usb)
9. [Testowanie — co powinno działać](#testowanie--co-powinno-działać)
10. [Rozwiązywanie problemów](#rozwiązywanie-problemów)
11. [Tryb deweloperski (opcjonalnie)](#tryb-deweloperski-opcjonalnie)
12. [Kolejne fazy (plan)](#kolejne-fazy-plan)

---

## Jak to działa (w skrócie)

```
┌─────────────────┐     HTTPS      ┌──────────────────────────┐
│  Telefon        │ ──────────────►│  fin.samsoft.pl/app/     │
│  (APK Android)  │                │  (React — ten sam co web) │
│  WebView        │ ──────────────►│  fin.samsoft.pl/api/     │
└─────────────────┘     HTTPS      └──────────────────────────┘
```

| Co zmieniasz | Gdzie budujesz | Co musisz zrobić |
|--------------|----------------|------------------|
| React (UI, logika w `frontend/`) | WSL: `make deploy` | Deploy na serwer; **nie** przebudowujesz APK |
| Konfiguracja Capacitor, pluginy, `AndroidManifest` | WSL: `make mobile-build` | Przebuduj APK (`make mobile-install-apk`) |

**Capacitor** to most między kodem web a natywnym Androidem. Folder `mobile/android/` to standardowy projekt Gradle (jak w „prawdziwej” apce Android), ale UI pochodzi z serwera.

---

## Co jest w którym folderze

```
fin/
├── frontend/              # React (wspólny z przeglądarką)
├── mobile/
│   ├── package.json       # zależności Capacitor (npm)
│   ├── capacitor.config.ts# appId, remote URL produkcji
│   ├── www/               # placeholder (cap sync); runtime ładuje serwer
│   ├── android/           # projekt Android Studio (commitowany)
│   ├── scripts/           # skrypty pomocnicze (setup-android.sh)
│   └── README.md          # ten plik
└── Makefile               # make mobile-install, mobile-sync, …
```

| Plik | Znaczenie |
|------|-----------|
| `capacitor.config.ts` | `appId: pl.samsoft.samfin`, `server.url` → produkcja, `adjustMarginsForEdgeToEdge: 'auto'` (Android 15+) |
| `android/` | Projekt Gradle; plugin `CsvIntentPlugin` (intent CSV) |
| `www/index.html` | Tylko dla `cap sync`; użytkownik go nie widzi przy remote URL |
| `scripts/generate-icons.py` | Generuje ikonę apki z `frontend/public/images/samfin_logo_ico.png` |

---

## Wymagania — jednorazowa konfiguracja

### WSL — build APK (Gradle)

| Narzędzie | Wersja | Sprawdzenie |
|-----------|--------|-------------|
| **JDK** | **21** (Capacitor 7) | `java -version` |
| **Android SDK** | platform **35**, build-tools | `mobile/android/local.properties` lub `ANDROID_HOME` |
| Node.js | **≥ 20** | `nvm use 20` |
| nvm (zalecane) | — | plik `mobile/.nvmrc` |

JDK 21:

```bash
sudo apt install openjdk-21-jdk
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
```

Android SDK — patrz sekcja [Budowanie APK w WSL](#budowanie-apk-w-wsl-zalecane).

### Windows — instalacja na telefonie

| Narzędzie | Uwagi |
|-----------|-------|
| **platform-tools** (`adb`) | Z Android Studio lub [platform-tools zip](https://developer.android.com/tools/releases/platform-tools) |
| Kabel USB | Debugowanie USB na telefonie |

### Android Studio (opcjonalnie)

Studio nie jest wymagane. Przy projekcie na dysku WSL (`\\wsl...`) Gradle w Studio często się wywala — wtedy używaj `make mobile-build-apk` w WSL.

### Telefon (opcjonalnie na start, potrzebny w Fazie 2+)

1. **Ustawienia → Informacje o telefonie** → 7× tapnięcie „Numer kompilacji” (włącza opcje deweloperskie).
2. **Opcje deweloperskie** → włącz **Debugowanie USB**.
3. Podłącz kabel; na telefonie zaakceptuj „Zezwolić na debugowanie USB?”.

### Ścieżka projektu w Android Studio

Repo leży w WSL, ale Studio otwierasz **z Windows** przez ścieżkę UNC:

```
\\wsl.localhost\Ubuntu-24.04\home\msamotyj\www\fin\mobile\android
```

(alternatywnie: `\\wsl$\Ubuntu-24.04\home\msamotyj\www\fin\mobile\android`)

> **Ważne:** `npm install` i `cap sync` uruchamiaj **tylko w WSL**, nie w PowerShell na `C:\`.

---

## Pierwsze uruchomienie (Faza 1)

Wykonaj **raz**, gdy klonujesz repo lub po dużych zmianach w Capacitor.

### Krok 1 — WSL: zależności npm

Z katalogu głównego repozytorium (`/home/msamotyj/www/fin`):

```bash
make mobile-install
```

To instaluje `@capacitor/core`, `@capacitor/cli`, `@capacitor/android` w `mobile/node_modules/`.

### Krok 2 — WSL: synchronizacja z Androidem

```bash
make mobile-sync
```

Co robi `cap sync android`:

- kopiuje `capacitor.config.ts` → `android/app/src/main/assets/capacitor.config.json`
- aktualizuje pluginy Gradle
- synchronizuje placeholder z `www/`

Po pierwszym klonie (gdy brakuje folderu `android/`):

```bash
make mobile-setup-android
```

### Krok 3 — WSL: pierwszy APK

```bash
make mobile-build-apk
```

(lub `make mobile-build` = sync + APK)

### Krok 4 — instalacja na telefonie

```bash
make mobile-copy-apk          # opcjonalnie: kopiuje do Pobranych Windows
make mobile-install-apk       # adb install -r (telefon podłączony USB)
```

Albo ręcznie w PowerShell: `adb install -r C:\Users\...\Downloads\app-debug.apk`

### Krok 5 — Co powinieneś zobaczyć

1. Aplikacja **SamFin** instaluje się i startuje.
2. Krótki ekran startowy (splash Capacitor).
3. Ładuje się strona logowania z **https://fin.samsoft.pl/app/** (jak w przeglądarce).
4. Logowanie email + hasło powinno działać.

Jeśli widzisz białą stronę lub błąd sieci — patrz [Rozwiązywanie problemów](#rozwiązywanie-problemów).

---

## Budowanie APK w WSL (zalecane)

Z katalogu `fin/`:

| Komenda | Opis |
|---------|------|
| `make mobile-build-apk` | Gradle `assembleDebug` (JDK 21 + SDK) |
| `make mobile-build` | `mobile-sync` + build APK; **pyta** o kopiowanie do `backend/public/downloads/` |
| `make mobile-build-i` | jak `mobile-build`, ale kopiuje APK do `downloads/` **bez pytania** (`-i`) |
| `make mobile-copy-apk` | Kopiuje APK do `Pobrane` na Windows |
| `make mobile-install-apk` | `adb install -r` przez `adb.exe` z Windows |

Lista wszystkich celów: **`make`** lub **`make help`** (z katalogu `fin/`).

### Android SDK (jednorazowo)

1. Zainstaluj [command-line tools](https://developer.android.com/studio#command-tools) do `~/Android/cmdline-tools/latest/`.
2. `sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"`
3. Plik `mobile/android/local.properties` (tworzy się automatycznie przy pierwszym `make mobile-build-apk`):

```properties
sdk.dir=/home/msamotyj/Android
```

Alternatywa: SDK ze Studia na Windows — `sdk.dir=/mnt/c/Users/48607/AppData/Local/Android/Sdk`

### Opcjonalna konfiguracja

Skopiuj `mobile/build.env.example` → `mobile/build.env` (gitignored), np.:

```bash
ADB_WIN=/mnt/c/Users/48607/AppData/Local/Android/Sdk/platform-tools/adb.exe
MOBILE_WIN_DOWNLOADS=/mnt/c/Users/48607/Downloads
```

### Typowe błędy

| Błąd | Rozwiązanie |
|------|-------------|
| `invalid source release: 21` | JDK 21, nie 17: `sudo apt install openjdk-21-jdk` |
| `SDK location not found` | `local.properties` lub `ANDROID_HOME` |
| `Permission denied` na `gradlew` | `chmod +x mobile/android/gradlew` (skrypt robi to sam) |
| `adb: unauthorized` | Na telefonie zaakceptuj debugowanie USB |

### Wersjonowanie i publikacja APK (WWW)

Plik [`mobile/version.json`](version.json) (commitowany):

```json
{
  "versionName": "0.9.12",
  "versionCode": 12,
  "minVersionCode": null
}
```

- **`versionName`** — etykieta wersji (zsynchronizuj z `frontend/package.json` przy release).
- **`versionCode`** — liczba całkowita rosnąca; podbij przy każdym publikowanym APK.
- **`minVersionCode`** — opcjonalnie: apki poniżej tej wartości **nie wystartują** (ekran wymuszonej aktualizacji).

Po buildzie (`make mobile-build` lub `make mobile-build-i`) skrypt może skopiować APK do `backend/public/downloads/`:

- `samfin-{versionName}.apk` — wersjonowany plik
- `samfin.apk` — zawsze najnowszy
- `mobile.json` — manifest dla apki i strony „O aplikacji”

Workflow publikacji:

```bash
make mobile-build-i   # build + kopiuj do downloads/
make deploy           # wgrywa app/ + downloads/ na serwer
```

URL produkcyjny: `https://fin.samsoft.pl/downloads/mobile.json`

Aktualizacja w apce: porównanie `App.getInfo().build` (versionCode) z manifestem; opcjonalny baner lub blokada UI gdy `minVersionCode` ustawione.

---

## Codzienny workflow

### Zmieniłeś tylko React (`frontend/`)

```bash
# WSL
make deploy          # wrzuca nowy frontend na produkcję
```

Na telefonie: zamknij apkę i otwórz ponownie (albo pull-to-refresh jeśli działa). **Nie** przebudowujesz APK.

### Zmieniłeś `capacitor.config.ts`, `AndroidManifest`, plugin natywny

```bash
# WSL
make mobile-build
make mobile-install-apk
```

### Zmieniłeś app lock / token storage (`frontend/src/mobile/`, pluginy Capacitor)

```bash
make deploy                 # React (ekran PIN, AuthProvider)
make mobile-build           # Preferences, App, Native Biometric + USE_BIOMETRIC
make mobile-install-apk
```

Pierwsze logowanie na telefonie po deploy: ekran **Ustaw PIN**. Po ustawieniu PIN — przejście w tło i powrót wymaga odblokowania.

### Zmieniłeś intent CSV / plugin Android (`CsvIntentPlugin`, `AndroidManifest`)

```bash
make mobile-build
make mobile-install-apk
```

### Zmieniłeś obsługę CSV w React (`frontend/src/mobile/`, `ImportNowy`)

```bash
make deploy
# APK tylko jeśli zmieniłeś też warstwę natywną
```

### Zmieniłeś ikonę apki (`samfin_logo_ico.png`)

Źródło: `frontend/public/images/samfin_logo_ico.png` (to samo logo co w sidebarze web).

```bash
# WSL — podmień PNG, potem:
make mobile-icons        # generuje mipmap-*/ic_launcher*.png (wymaga: python3-pil)
make mobile-build
make mobile-install-apk
```

Sam `make deploy` **nie** aktualizuje ikony na ekranie głównym telefonu — ikona jest w APK.

Jeśli launcher nie odświeży ikony: odinstaluj apkę i zainstaluj ponownie.

---

## Android Studio (opcjonalnie)

Jeśli mimo wszystko chcesz Studio — projekt na dysku WSL (`\\wsl...`) często powoduje błędy Gradle (*Niepoprawna funkcja*, *restricted write*). Lepiej:

- build w WSL: `make mobile-build-apk`, albo
- pełny klon repo na `C:\` i Studio na `C:\...\fin\mobile\android`.

### Otwarcie projektu (gdy repo na C:\)

1. **File → Open** → `C:\...\fin\mobile\android`
2. Gradle Sync → Run ▶

### Ścieżka WSL (często problematyczna)

```
\\wsl.localhost\Ubuntu-24.04\home\msamotyj\www\fin\mobile\android
```

## Instalacja na telefonie (USB)

### Metoda A — z Android Studio (najprostsza)

Podłącz telefon → wybierz go na liście urządzeń → **Run** ▶.

### Metoda B — `adb install` (Windows)

1. Zainstaluj platform-tools (z Android Studio: **SDK Manager → Android SDK → Android SDK Platform-Tools**).
2. W PowerShell / CMD:

```powershell
adb devices
# powinno pokazać np. XXXXX    device

adb install "\\wsl.localhost\Ubuntu-24.04\home\msamotyj\www\fin\mobile\android\app\build\outputs\apk\debug\app-debug.apk"
```

Jeśli `adb` nie jest w PATH, użyj pełnej ścieżki, np.:

```
C:\Users\<Ty>\AppData\Local\Android\Sdk\platform-tools\adb.exe
```

### Metoda C — skopiuj APK na telefon

Wyślij `app-debug.apk` mailem / Dyskiem / kablem i otwórz na telefonie.  
Włącz **„Instalacja z nieznanych źródeł”** dla menedżera plików (Android zapyta przy pierwszej instalacji).

---

## Testowanie — co powinno działać

| Test | Oczekiwany wynik |
|------|------------------|
| Start aplikacji | Ekran logowania SamFin (produkcja) |
| Logowanie | Przekierowanie do dashboardu |
| Nawigacja | Menu / import / transakcje jak w przeglądarce |
| Wylogowanie | Powrót do ekranu logowania |
| **CSV z mBanku (Faza 2)** | Eksport CSV → Udostępnij / Otwórz za pomocą → SamFin → po zalogowaniu ekran Import z wybranym plikiem i bankiem mBank → **Importuj** |
| **Równoległa sesja (Faza 3)** | Zalogowany na telefonie i w przeglądarce jednocześnie; wylogowanie na jednym urządzeniu nie wylogowuje drugiego |
| **App lock (Faza 4)** | Po pierwszym logowaniu — ustawienie PIN (4–8 cyfr); opcjonalnie odcisk palca; po przejściu apki w tło — ekran PIN/odcisku; token API w Preferences (nie localStorage) |

**Nie działa jeszcze (kolejne fazy):** dopracowany UX importu mobile (Faza 5).

### Test importu CSV z mBanku

1. W aplikacji mBanku wyeksportuj historię do CSV.
2. Wybierz **Otwórz za pomocą** (lub udostępnij) → **SamFin**.
3. Jeśli nie jesteś zalogowany — zaloguj się; plik czeka w cache apki.
4. Powinieneś trafić na **Import → Nowy** z podpowiedzią i nazwą pliku.
5. Kliknij **Importuj** — dalszy flow jak w przeglądarce (walidacja → szczegóły → klasyfikacja).

Wymaga: `make deploy` (frontend) + `make mobile-build` + `make mobile-install-apk` (natywny intent + plugin).

---

## Rozwiązywanie problemów

### Topbar nachodzi na pasek statusu (data, godzina, ikonki)

Na Androidzie 15+ WebView domyślnie rysuje treść **pod** paskiem systemowym (edge-to-edge).

W `capacitor.config.ts` jest `android.adjustMarginsForEdgeToEdge: 'auto'` — Capacitor przesuwa WebView pod status bar. **Nie trzeba** zmian w React ani osobnych pluginów.

Po zmianie tej opcji: `make mobile-build` + `make mobile-install-apk` (sam `make deploy` nie wystarczy).

### „Gradle Sync failed” w Android Studio

- Sprawdź internet (Gradle pobiera zależności).
- **File → Invalidate Caches → Invalidate and Restart**.
- Upewnij się, że otwierasz folder **`mobile/android`**, nie `mobile/` ani całe `fin/`.

### Czarny ekran po starcie apki

Najczęstsza przyczyna u nas: **certyfikat HTTPS self-signed** na `fin.samsoft.pl`.  
Przeglądarka na telefonie może pokazać ostrzeżenie i pozwolić wejść — **WebView w apce domyślnie blokuje** taki certyfikat.

Sprawdzenie (WSL):

```bash
curl -vI https://fin.samsoft.pl/app/ 2>&1 | grep -i "SSL certificate"
```

Jeśli widzisz `self-signed certificate` — to jest przyczyna.

**Docelowe rozwiązanie:** Let's Encrypt (lub inny zaufany cert) na hostingu `fin.samsoft.pl`.

**Tymczasowo w apce:** `MainActivity` akceptuje SSL tylko dla `fin.samsoft.pl` (sideload / własny serwer). Po wdrożeniu prawdziwego certyfikatu można ten override usunąć.

### Biała strona / „Web page not available”

- Telefon/emulator musi mieć internet.
- Sprawdź w przeglądarce telefonu: czy `https://fin.samsoft.pl/app/` się otwiera.
- Upewnij się, że po zmianie `capacitor.config.ts` zrobiłeś `make mobile-sync` i przebudowałeś APK.

### `[fatal] Capacitor CLI requires NodeJS >= 20`

```bash
source ~/.nvm/nvm.sh && nvm use 20
make mobile-install
```

### `cap sync` w PowerShell na Windows — nie rób tego

Używaj WSL lub `make mobile-sync` z terminala WSL w Cursor.

### Studio nie widzi folderu WSL

- Sprawdź, czy WSL działa: `wsl -l -v` w PowerShell.
- Użyj ścieżki `\\wsl.localhost\Ubuntu-24.04\...` zamiast `/home/...` w oknie Open.

### Telefon nie pojawia się w Studio

- Kabel danych (nie tylko ładowania).
- Debugowanie USB włączone; zaakceptowany dialog RSA na telefonie.
- `adb devices` — jeśli `unauthorized`, odłącz/podłącz i zaakceptuj ponownie.

### Dwa systemy edytują `mobile/android/`

Sync (`cap sync`) **zawsze z WSL**. Unikaj ręcznej edycji tych samych plików jednocześnie w Windows i WSL.

---

## Tryb deweloperski (opcjonalnie)

Domyślnie apka ładuje **produkcję**. Żeby testować lokalny Vite bez deployu:

1. Uruchom frontend w Dockerze: `docker compose up -d frontend` (port 5173).
2. W `capacitor.config.ts` **tymczasowo** zmień:

```ts
server: {
  url: 'http://192.168.x.x:5173',  // IP twojego PC w LAN (nie localhost!)
  cleartext: true,
},
```

3. `make mobile-sync` → przebuduj APK w Studio.

> `localhost` na telefonie to **telefon**, nie PC — dlatego używasz IP komputera w sieci Wi‑Fi.

**Przed commitem** przywróć URL produkcyjny.

---

## Kolejne fazy (plan)

| Faza | Opis |
|------|------|
| **1** | Szkielet Capacitor, remote URL, pierwszy APK |
| **2** | Intent CSV z mBanku → ekran importu |
| **3** | Multi-token backend — równoległa sesja web + mobile |
| **4** | App lock — PIN / odcisk, token w Preferences (secure storage) |
| **5** | UX importu na mobile — komunikat mBank, większy przycisk, „Zmień bank” |
| **6** | Dokumentacja w `docs/` (ADR-033, `modules.md`, `database.md`, reguła języka) |

---

## Przydatne komendy (ściąga)

```bash
# WSL — z katalogu fin/ (pełna lista: make  lub  make help)
make mobile-install
make mobile-sync
make mobile-build-apk    # sam APK
make mobile-build        # sync + APK
make mobile-copy-apk
make mobile-install-apk
make mobile-icons        # po zmianie frontend/public/images/samfin_logo_ico.png
make mobile-doctor
make deploy              # deploy frontendu na produkcję
```

---

## Linki

- [Capacitor — Workflow](https://capacitorjs.com/docs/basics/workflow)
- [Capacitor — Android](https://capacitorjs.com/docs/android)
- [Capacitor — Server / Live Reload](https://capacitorjs.com/docs/guides/live-reload)
