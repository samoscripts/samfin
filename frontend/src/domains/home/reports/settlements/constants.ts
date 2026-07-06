import type { PersonKey, WalletGroupKey } from '@/shared/api/settlements'
import { formatAmount } from '@/shared/utils/format'

/** Etykiety UI modułu rozliczeń (widoczne dla użytkownika). */
export const SETTLEMENT_UI_LABELS = {
  rotationAnchorBadge: 'Teraz wpłaca',
  rotationAnchorHint: 'Ta osoba wpłaca w tej rotacji',
  settlementPeriod: 'Okres rozliczeniowy',
  settlementPeriodClosed: 'Okres zamknięty',
  settlementPeriodRange: (from: string, to: string) => `${from} — ${to}`,
  refreshSettlements: 'Odśwież rozliczenia',
  refreshSettlementsError: 'Nie udało się odświeżyć rozliczeń.',
  cumulativeBalance: 'Saldo skumulowane',
  cumulativeBalanceAsOf: (date: string) => `Saldo skumulowane (stan na ${date})`,
  refreshToSeeCumulative: 'Odśwież rozliczenia, aby zobaczyć saldo skumulowane',
  needsRefreshBanner:
    'Rozliczenia wymagają odświeżenia — dane mogą być nieaktualne. Kliknij „Odśwież rozliczenia”.',
  lastRefreshedAt: 'Ostatnie odświeżenie',
  effectivePeriod: 'Zakres danych w okresie',
  goToCurrentYear: 'Bieżący rok',
  prevYear: 'Poprzedni rok',
  nextYear: 'Następny rok',
  rotationDepositsInPeriod: 'Wpłaty rotacyjne w okresie',
  ownContributionsInPeriod: 'Wkłady własne w okresie',
  bankDepositsInPeriod: 'Przelewy na konto w okresie',
  depositsTotalCumulativeHint: 'Σ łącznie (przelewy + wkłady własne, skumulowane)',
  ownContributionsSummaryTitle: 'Wkłady własne — podsumowanie',
  ownContributionsSummaryHint:
    'Wydatki ze źródeł wpłat na budżet domowy — liczą się do Σ rotacji.',
  ownContributionsDetailsLink: 'Szczegóły w zakładce Wkłady własne',
  simulationBadge: 'Symulacja',
  simulationAfterAnchor: (anchor: string, amount: string) =>
    `Po wpłacie ${anchor}: ${amount}`,
  walletDebtNow: (amount: string) => `Dług portfelowy teraz: ${amount}`,
  formulaCurrentState: 'Stan obecny (bez wpłaty kotwicy)',
  personalWalletsTitle: 'Portfele osobiste — podsumowanie',
  walletExpensesInPeriod: 'Wydatki w okresie',
  walletIncomesInPeriod: 'Wpływy w okresie',
  walletCumulativeBalance: 'Saldo skumulowane',
} as const

export const SETTLEMENT_FORMULA_HINTS = {
  formulaIntro:
    'Sugerowana wpłata rotacyjna = max(0, wyrównanie + saldo portfeli − prepaid). Poniżej wartości składowe z bieżącego stanu rozliczenia.',
  baseAmount:
    'Stała kwota z konfiguracji rozliczenia — używana jako wyrównanie, gdy stan kotwicy ≥ 0.',
  catchUpNegative:
    'Gdy stan kotwicy < 0, wyrównanie dorównuje zaległość w Σ wpłat rotacyjnych (przelewy + wkłady własne).',
  catchUpNonNegative:
    'Gdy stan kotwicy ≥ 0, wyrównanie = kwota bazowa (kolej bez zaległości w Σ).',
  walletNet:
    'Suma skumulowanych sald portfeli osobistych na dzień ostatniego odświeżenia — zwiększa sugerowaną wpłatę.',
  prepaid:
    'Prepaid na start z konfiguracji — zmniejsza sugerowaną wpłatę.',
  rawBeforeMax:
    'Suma składowych przed ograniczeniem do zera (ujemny wynik oznacza nadpłatę względem formuły).',
} as const

export function formatCatchUpDetail(
  person: PersonKey,
  rotation: { stanMaciek: number; stanBasia: number; maciekDepositsTotal: number; basiaDepositsTotal: number; baseAmount: number },
  catchUpAmount: number,
): string {
  const personStan = person === 'maciek' ? rotation.stanMaciek : rotation.stanBasia
  const personLabel = PERSON_LABELS[person]
  const otherLabel = PERSON_LABELS[person === 'maciek' ? 'basia' : 'maciek']
  const personSigma = person === 'maciek' ? rotation.maciekDepositsTotal : rotation.basiaDepositsTotal
  const otherSigma = person === 'maciek' ? rotation.basiaDepositsTotal : rotation.maciekDepositsTotal

  if (personStan < 0) {
    return `Stan ${personLabel} = ${formatAmount(personStan)} → Σ ${otherLabel} (${formatAmount(otherSigma)}) − Σ ${personLabel} (${formatAmount(personSigma)}) = ${formatAmount(catchUpAmount)}`
  }
  if (catchUpAmount === rotation.baseAmount) {
    return `Stan ${personLabel} = ${formatAmount(personStan)} ≥ 0 → wyrównanie = kwota bazowa (${formatAmount(rotation.baseAmount)})`
  }
  return `Σ ${otherLabel} (${formatAmount(otherSigma)}) − Σ ${personLabel} (${formatAmount(personSigma)}) = ${formatAmount(catchUpAmount)}`
}

export const SETTLEMENT_SETTINGS_LABELS = {
  ledgerFieldset: 'Ewidencja i start rozliczeń',
  ledgerHint:
    'Po zmianie konfiguracji lub transakcji odśwież rozliczenia w zakładce Raport. Transakcje sprzed daty startu ewidencji nie wchodzą do obliczeń. Okresy rozliczeniowe są roczne (1.01–31.12); zamknięcie następuje automatycznie po zakończeniu roku.',
  reindexFromDate: 'Data startu ewidencji',
  openingNextDepositor: 'Kolej na start ewidencji',
  needsRefresh: 'Rozliczenia wymagają odświeżenia.',
} as const

export const PERSON_LABELS: Record<PersonKey, string> = {
  maciek: 'Maciek',
  basia: 'Basia',
}

export const WALLET_GROUP_LABELS: Record<WalletGroupKey, string> = {
  maciek: 'Portfele Maćka',
  basia: 'Portfele Basi',
  other: 'Inne',
}

export type PersonTheme = {
  card: string
  section: string
  anchorGlow: string
  icon: string
  label: string
  badge: string
  badgeDot: string
}

/** Klasy sekcji/karty — świecące tło tylko gdy `isAnchor`. Border bez zmian. */
export function personSectionClasses(
  person: PersonKey,
  opts: { isAnchor?: boolean; variant?: 'card' | 'section' } = {},
): string {
  const theme = PERSON_THEMES[person]
  const base = opts.variant === 'card' ? theme.card : theme.section
  if (!opts.isAnchor) return base
  return [base, theme.anchorGlow].join(' ')
}

export const PERSON_THEMES: Record<PersonKey, PersonTheme> = {
  maciek: {
    card: 'bg-[#163526]/5 dark:bg-[#163526]/15 border-[#163526]/20 dark:border-[#163526]/35',
    section: 'bg-[#163526]/[0.03] dark:bg-[#163526]/10 border-[#163526]/15 dark:border-[#163526]/30',
    anchorGlow:
      'shadow-[0_0_20px_rgba(134,239,172,0.55)] dark:shadow-[0_0_20px_rgba(52,211,153,0.45)]',
    icon: 'text-[#1a472a] dark:text-emerald-400',
    label: 'text-[#163526] dark:text-emerald-300/90',
    badge: 'bg-[#1a472a] text-white dark:bg-[#163526]',
    badgeDot: 'bg-emerald-500',
  },
  basia: {
    card: 'bg-[#c9a96e]/8 dark:bg-[#c9a96e]/10 border-[#c9a96e]/35 dark:border-[#c9a96e]/30',
    section: 'bg-[#c9a96e]/5 dark:bg-[#c9a96e]/8 border-[#c9a96e]/25 dark:border-[#c9a96e]/22',
    anchorGlow:
      'shadow-[0_0_20px_rgba(253,230,138,0.6)] dark:shadow-[0_0_20px_rgba(251,191,36,0.45)]',
    icon: 'text-[#8a7340] dark:text-[#c9a96e]',
    label: 'text-[#7a6340] dark:text-[#c9a96e]',
    badge: 'bg-[#c9a96e] text-white',
    badgeDot: 'bg-[#c9a96e]',
  },
}

export const OTHER_SECTION_THEME =
  'bg-gray-50/50 dark:bg-gray-900/60 border-gray-200 dark:border-gray-700'
