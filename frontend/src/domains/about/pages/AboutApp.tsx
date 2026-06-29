import { useEffect, useState } from 'react'
import { Download, ExternalLink, Smartphone } from 'lucide-react'
import { useAppInfo } from '@/shared/hooks/useAppInfo'
import { fetchMobileRelease, type MobileRelease } from '@/shared/api/mobileRelease'
import { isNativeApp } from '@/mobile/platform'

const PAGE_CLS = 'p-4 md:p-6 max-w-screen-xl space-y-8'

function Section({
  title,
  children,
  id,
}: {
  title: string
  children: React.ReactNode
  id?: string
}) {
  return (
    <section id={id} className="space-y-3 scroll-mt-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3 leading-relaxed">
        {children}
      </div>
    </section>
  )
}

function ModuleCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-4">
      <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  )
}

function MobileAppSection() {
  const [release, setRelease] = useState<MobileRelease | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetchMobileRelease()
      .then(setRelease)
      .finally(() => setLoading(false))
  }, [])

  return (
    <Section title="Aplikacja mobilna (Android)" id="mobilna">
      <p>
        Aplikacja mobilna SamFin to wygodny dostęp do tego samego konta co w przeglądarce — z
        dodatkowymi funkcjami na telefonie:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>blokada aplikacji PIN-em lub odciskiem palca,</li>
        <li>osobna sesja mobilna (równolegle z przeglądarką),</li>
        <li>import pliku CSV z mBanku przez „Otwórz za pomocą” na telefonie.</li>
      </ul>
      <p>
        Interfejs aplikacji ładuje się z serwera — po wdrożeniu zmian w webie widzisz je od razu,
        bez przeinstalowywania APK. Nową wersję APK instalujesz tylko wtedy, gdy zmienia się
        warstwa natywna (np. zabezpieczenia, import CSV).
      </p>

      {loading && <p className="text-gray-500">Sprawdzanie dostępności pliku APK…</p>}

      {!loading && release && (
        <div className="rounded-xl border border-[#1a472a]/30 bg-[#1a472a]/5 dark:bg-[#1a472a]/10 p-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-[#1a472a] p-2 text-white shrink-0">
              <Smartphone size={20} />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                SamFin {release.versionName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Opublikowano:{' '}
                {release.publishedAt
                  ? new Date(release.publishedAt).toLocaleString('pl-PL')
                  : '—'}
              </p>
            </div>
          </div>

          <a
            href={release.latestApkUrl}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1a472a] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#163526] transition-colors"
          >
            <Download size={16} />
            Pobierz samfin.apk
          </a>
          <p className="text-xs text-gray-500">
            Wersjonowany plik:{' '}
            <a
              href={release.apkUrl}
              className="text-[#1a472a] dark:text-[#c9a96e] hover:underline inline-flex items-center gap-1"
            >
              {release.apkUrl.replace('/downloads/', '')}
              <ExternalLink size={12} />
            </a>
          </p>
        </div>
      )}

      {!loading && !release && (
        <p className="text-gray-500 italic">
          Plik APK nie jest obecnie dostępny do pobrania z tego serwera.
        </p>
      )}

      <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-2">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
          Instalacja na Androidzie (pobranie spoza sklepu)
        </h3>
        <ol className="list-decimal pl-5 space-y-1 text-sm">
          <li>Pobierz plik APK przyciskiem powyżej.</li>
          <li>
            W ustawieniach telefonu zezwól na instalację z nieznanego źródła (dla przeglądarki lub
            menedżera plików).
          </li>
          <li>Otwórz pobrany plik i potwierdź instalację.</li>
          <li>Przy aktualizacji pobierz nową wersję — instalator nadpisze starą aplikację.</li>
        </ol>
      </div>

      {isNativeApp() && (
        <p className="text-xs text-gray-500">
          Korzystasz już z aplikacji mobilnej. Informacje o dostępnych aktualizacjach pojawią się
          automatycznie u góry ekranu.
        </p>
      )}
    </Section>
  )
}

export default function AboutApp() {
  const info = useAppInfo()

  return (
    <div className={PAGE_CLS}>
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">O aplikacji</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Przewodnik po modułach i konfiguracji SamFin
          {info?.version ? ` · wersja web ${info.version}` : ''}
        </p>
      </header>

      <Section title="Czym jest SamFin?">
        <p>
          SamFin to system budżetu domowego dla wielu użytkowników. Pomaga importować operacje z
          banku, klasyfikować wydatki i przychody, analizować dane oraz prowadzić rozliczenia —
          wszystko w oparciu o wspólną konfigurację słowników.
        </p>
      </Section>

      <Section title="Moduły">
        <div className="grid gap-3 sm:grid-cols-2">
          <ModuleCard
            title="Dashboard"
            description="Podsumowanie salda, przychodów, wydatków i liczby transakcji wymagających klasyfikacji."
          />
          <ModuleCard
            title="Transakcje"
            description="Lista operacji z filtrami, edycją, klasyfikacją na pozycje (portfel, kategoria, podmioty) oraz regułami auto-klasyfikacji."
          />
          <ModuleCard
            title="Import"
            description="Import plików CSV z mBanku: walidacja, historia importów, podgląd błędów i wierszy przed zatwierdzeniem."
          />
          <ModuleCard
            title="Raporty"
            description="Analizy okresowe oraz rozliczenia (np. konto wspólne) z konfiguracją reguł rozliczeniowych."
          />
          <ModuleCard
            title="Konfiguracja"
            description="Słowniki: podmioty, portfele, obszary (dotyczy), kategorie i reguły klasyfikacji transakcji."
          />
          <ModuleCard
            title="Ustawienia"
            description="Dla administratorów: użytkownicy, operacje systemowe na transakcjach, kopie zapasowe bazy danych."
          />
        </div>
      </Section>

      <Section title="Od czego zacząć konfigurację?">
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            <strong className="text-gray-800 dark:text-gray-200">Podmioty</strong> — osoby i firmy
            (Skąd / Dokąd w transakcjach).
          </li>
          <li>
            <strong className="text-gray-800 dark:text-gray-200">Rachunki bankowe</strong> —
            przypisane do podmiotów (używane przy imporcie CSV).
          </li>
          <li>
            <strong className="text-gray-800 dark:text-gray-200">Kategorie</strong> — drzewo
            kategorii wydatków i przychodów.
          </li>
          <li>
            <strong className="text-gray-800 dark:text-gray-200">Portfele i obszary</strong> —
            dodatkowy wymiar klasyfikacji pozycji transakcji.
          </li>
          <li>
            <strong className="text-gray-800 dark:text-gray-200">Import CSV</strong> — pierwszy
            import historii operacji z banku.
          </li>
          <li>
            <strong className="text-gray-800 dark:text-gray-200">Reguły klasyfikacji</strong> —
            opcjonalnie, do automatycznego uzupełniania pól transakcji.
          </li>
        </ol>
      </Section>

      <MobileAppSection />
    </div>
  )
}
