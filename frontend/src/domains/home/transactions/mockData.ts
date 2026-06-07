import { Transaction } from '@/shared/types'

export const ENTITY_LABELS: Record<string, string> = {
  KONTO_WSPOLNE: 'Konto wspólne',
  KONTO_MACKA: 'Konto Maćka',
  KONTO_FIRMOWE_BASI: 'Konto firmowe Basi',
  GOTOWKA: 'Gotówka',
  BASIA: 'Basia',
  MACIEJ: 'Maciej',
  PAYTEL: 'Paytel',
  ALLEGRO: 'Allegro',
  SZWAGIERKA: 'Szwagierka',
  ZUS: 'ZUS',
  BIEDRONKA: 'Biedronka',
  ROSSMANN: 'Rossmann',
  ZALANDO: 'Zalando',
  ENERGA: 'Energa',
  ORLEN: 'Orlen',
  HEBE: 'Hebe',
  APTEKA: 'Apteka',
  OSZCZEDNOSCI_WSPOLNE: 'Oszczędności wspólne',
  OSZCZEDNOSCI_TOSI: 'Oszczędności Tosi',
  URZAD_SKARBOWY: 'Urząd skarbowy',
  HURTOWNIA_FRYZJERSKA: 'Hurtownia fryzjerska',
  LODZIARNIA: 'Lodziarnia',
  NIEZNANY: 'Nieznany',
  PAYTEL_BASI: 'Paytel Basi',
  LINIE_LOTNICZE: 'Linie lotnicze',
  SKLEP_KOMPUTEROWY: 'Sklep komputerowy',
  CASTORAMA: 'Castorama',
  SKLEP_OBUWNICZY: 'Sklep obuwniczy',
  SKLEP_SPOZYWCZY: 'Sklep spożywczy',
  STEAM: 'Steam',
  DOSTAWCA_OPALU: 'Dostawca opału',
}

export const WALLET_LABELS: Record<string, string> = {
  BUDZET_DOMOWY: 'Budżet Domowy',
  PRYWATNY_BASI: 'Prywatny Basi',
  PORTFEL_MACKA: 'Portfel Maćka',
  SALON_FRYZJERSKI: 'Salon Fryzjerski',
  SAMSOFT: 'Samsoft',
}

export const CONCERN_LABELS: Record<string, string> = {
  WSPOLNE: 'Wspólne',
  MACIEJ: 'Maciej',
  BASIA: 'Basia',
  TOSIA: 'Tosia',
  SALON: 'Salon',
  SAMSOFT: 'Samsoft',
}

export const STATUS_LABELS: Record<string, string> = {
  UNCLASSIFIED: 'Nieklasyfikowany',
  PARTIALLY_CLASSIFIED: 'Częściowo',
  CLASSIFIED: 'Sklasyfikowany',
}

export const DIRECTION_LABELS: Record<string, string> = {
  EXPENSE: 'Wydatek',
  INCOME: 'Wpływ',
}

export function resolveLabel(map: Record<string, string>, key: string | undefined): string {
  if (!key) return '—'
  return map[key] ?? key
}

export const MOCK_TRANSACTIONS: Transaction[] = [
  { transactionId: 1, date: '2026-06-06', description: 'Biedronka', amount: -286.40, paidFrom: 'KONTO_WSPOLNE', paidTo: 'BIEDRONKA', direction: 'EXPENSE', status: 'CLASSIFIED', items: [{ id: 11, amount: -286.40, wallet: 'BUDZET_DOMOWY', concern: 'WSPOLNE', category: 'Spożywcze' }] },
  { transactionId: 2, date: '2026-06-06', description: 'Rossmann - kosmetyki Basi', amount: -400, paidFrom: 'KONTO_WSPOLNE', paidTo: 'ROSSMANN', direction: 'EXPENSE', status: 'CLASSIFIED', items: [{ id: 21, amount: -400, wallet: 'BUDZET_DOMOWY', concern: 'BASIA', category: 'Drogeria' }] },
  { transactionId: 3, date: '2026-06-05', description: 'Bilet lotniczy Basia - Rzym', amount: -1300, paidFrom: 'KONTO_WSPOLNE', paidTo: 'LINIE_LOTNICZE', direction: 'EXPENSE', status: 'CLASSIFIED', items: [{ id: 31, amount: -1300, wallet: 'PRYWATNY_BASI', concern: 'BASIA', category: 'Wakacje' }] },
  { transactionId: 4, date: '2026-06-05', description: 'Zalando - Basia i Tosia', amount: -500, paidFrom: 'KONTO_WSPOLNE', paidTo: 'ZALANDO', direction: 'EXPENSE', status: 'PARTIALLY_CLASSIFIED', items: [{ id: 41, amount: -350, wallet: 'BUDZET_DOMOWY', concern: 'BASIA', category: 'Ubrania' }, { id: 42, amount: -150, wallet: 'BUDZET_DOMOWY', concern: 'TOSIA', category: 'Ubrania' }] },
  { transactionId: 5, date: '2026-06-04', description: 'Energa - rachunek za prąd', amount: -1000, paidFrom: 'KONTO_WSPOLNE', paidTo: 'ENERGA', direction: 'EXPENSE', status: 'PARTIALLY_CLASSIFIED', items: [{ id: 51, amount: -400, wallet: 'BUDZET_DOMOWY', concern: 'WSPOLNE', category: 'Rachunki' }, { id: 52, amount: -600, wallet: 'SALON_FRYZJERSKI', concern: 'SALON', category: 'Rachunki' }] },
  { transactionId: 6, date: '2026-06-04', description: 'Przelew do salonu', amount: -1500, paidFrom: 'KONTO_WSPOLNE', paidTo: 'KONTO_FIRMOWE_BASI', direction: 'EXPENSE', status: 'CLASSIFIED', items: [{ id: 61, amount: -1500, concern: 'SALON' }] },
  { transactionId: 7, date: '2026-06-03', description: 'Pożyczka od szwagierki dla Basi', amount: 1500, paidFrom: 'SZWAGIERKA', paidTo: 'KONTO_WSPOLNE', direction: 'INCOME', status: 'CLASSIFIED', items: [{ id: 71, amount: 1500, wallet: 'PRYWATNY_BASI', concern: 'BASIA', category: 'Pożyczka' }] },
  { transactionId: 8, date: '2026-06-03', description: 'Przelew pożyczki na konto firmowe Basi', amount: -1500, paidFrom: 'KONTO_WSPOLNE', paidTo: 'KONTO_FIRMOWE_BASI', direction: 'EXPENSE', status: 'CLASSIFIED', items: [{ id: 81, amount: -1500, concern: 'SALON' }] },
  { transactionId: 9, date: '2026-06-02', description: 'Wpłata Basi', amount: 8000, paidFrom: 'BASIA', paidTo: 'KONTO_WSPOLNE', direction: 'INCOME', status: 'PARTIALLY_CLASSIFIED', items: [{ id: 91, amount: 5000, wallet: 'BUDZET_DOMOWY', concern: 'WSPOLNE', category: 'Zasilenie budżetu' }, { id: 92, amount: 3000, wallet: 'PRYWATNY_BASI', concern: 'BASIA', category: 'Środki prywatne' }] },
  { transactionId: 10, date: '2026-06-02', description: 'Wpłata Maćka', amount: 5000, paidFrom: 'MACIEJ', paidTo: 'KONTO_WSPOLNE', direction: 'INCOME', status: 'CLASSIFIED', items: [{ id: 101, amount: 5000, wallet: 'BUDZET_DOMOWY', concern: 'WSPOLNE', category: 'Zasilenie budżetu' }] },
  { transactionId: 11, date: '2026-06-01', description: '800+ Tosia', amount: 800, paidFrom: 'ZUS', paidTo: 'KONTO_WSPOLNE', direction: 'INCOME', status: 'CLASSIFIED', items: [{ id: 111, amount: 800, wallet: 'BUDZET_DOMOWY', concern: 'TOSIA', category: 'Dziecko' }] },
  { transactionId: 12, date: '2026-06-01', description: 'BLIK na konto Tosi', amount: -100, paidFrom: 'KONTO_WSPOLNE', paidTo: 'OSZCZEDNOSCI_TOSI', direction: 'EXPENSE', status: 'CLASSIFIED', items: [{ id: 121, amount: -100, concern: 'TOSIA' }] },
  { transactionId: 13, date: '2026-05-31', description: 'Automatyczne oszczędzanie po transakcji', amount: -3.27, paidFrom: 'KONTO_WSPOLNE', paidTo: 'OSZCZEDNOSCI_WSPOLNE', direction: 'EXPENSE', status: 'CLASSIFIED', items: [{ id: 131, amount: -3.27, concern: 'WSPOLNE', category: 'Oszczędności' }] },
  { transactionId: 14, date: '2026-05-31', description: 'Cykliczne odkładanie na oszczędności', amount: -500, paidFrom: 'KONTO_WSPOLNE', paidTo: 'OSZCZEDNOSCI_WSPOLNE', direction: 'EXPENSE', status: 'CLASSIFIED', items: [{ id: 141, amount: -500, concern: 'WSPOLNE', category: 'Oszczędności' }] },
  { transactionId: 15, date: '2026-05-30', description: 'Monitor do pracy', amount: -1200, paidFrom: 'KONTO_MACKA', paidTo: 'SKLEP_KOMPUTEROWY', direction: 'EXPENSE', status: 'CLASSIFIED', items: [{ id: 151, amount: -1200, wallet: 'SAMSOFT', concern: 'SAMSOFT', category: 'Elektronika' }] },
  { transactionId: 16, date: '2026-05-30', description: 'Wiertarka do domu', amount: -600, paidFrom: 'KONTO_WSPOLNE', paidTo: 'CASTORAMA', direction: 'EXPENSE', status: 'CLASSIFIED', items: [{ id: 161, amount: -600, wallet: 'BUDZET_DOMOWY', concern: 'WSPOLNE', category: 'Dom' }] },
  { transactionId: 17, date: '2026-05-29', description: 'Buty dla Tosi', amount: -300, paidFrom: 'KONTO_WSPOLNE', paidTo: 'SKLEP_OBUWNICZY', direction: 'EXPENSE', status: 'CLASSIFIED', items: [{ id: 171, amount: -300, wallet: 'BUDZET_DOMOWY', concern: 'TOSIA', category: 'Ubrania' }] },
  { transactionId: 18, date: '2026-05-29', description: 'Hebe - kosmetyki prywatne Basi', amount: -180, paidFrom: 'KONTO_WSPOLNE', paidTo: 'HEBE', direction: 'EXPENSE', status: 'CLASSIFIED', items: [{ id: 181, amount: -180, wallet: 'PRYWATNY_BASI', concern: 'BASIA', category: 'Drogeria' }] },
  { transactionId: 19, date: '2026-05-28', description: 'Orlen - paliwo', amount: -350, paidFrom: 'KONTO_WSPOLNE', paidTo: 'ORLEN', direction: 'EXPENSE', status: 'CLASSIFIED', items: [{ id: 191, amount: -350, wallet: 'BUDZET_DOMOWY', concern: 'WSPOLNE', category: 'Samochód' }] },
  { transactionId: 20, date: '2026-05-28', description: 'Allegro - zwrot za zamówienie', amount: 149.99, paidFrom: 'ALLEGRO', paidTo: 'KONTO_WSPOLNE', direction: 'INCOME', status: 'CLASSIFIED', items: [{ id: 201, amount: 149.99, wallet: 'BUDZET_DOMOWY', concern: 'WSPOLNE', category: 'Dom' }] },
  { transactionId: 21, date: '2026-05-27', description: 'Wpłata Paytel', amount: 3200, paidFrom: 'PAYTEL', paidTo: 'KONTO_FIRMOWE_BASI', direction: 'INCOME', status: 'CLASSIFIED', items: [{ id: 211, amount: 3200, wallet: 'SALON_FRYZJERSKI', concern: 'SALON', category: 'Salon' }] },
  { transactionId: 22, date: '2026-05-27', description: 'Hurtownia fryzjerska - kosmetyki', amount: -850, paidFrom: 'KONTO_FIRMOWE_BASI', paidTo: 'HURTOWNIA_FRYZJERSKA', direction: 'EXPENSE', status: 'CLASSIFIED', items: [{ id: 221, amount: -850, wallet: 'SALON_FRYZJERSKI', concern: 'SALON', category: 'Salon' }] },
  { transactionId: 23, date: '2026-05-26', description: 'ZUS Basi', amount: -120, paidFrom: 'KONTO_FIRMOWE_BASI', paidTo: 'URZAD_SKARBOWY', direction: 'EXPENSE', status: 'CLASSIFIED', items: [{ id: 231, amount: -120, wallet: 'SALON_FRYZJERSKI', concern: 'SALON', category: 'Salon' }] },
  { transactionId: 24, date: '2026-05-26', description: 'Lodziarnia - gotówka', amount: -42, paidFrom: 'GOTOWKA', paidTo: 'LODZIARNIA', direction: 'EXPENSE', status: 'CLASSIFIED', items: [{ id: 241, amount: -42, wallet: 'BUDZET_DOMOWY', concern: 'WSPOLNE', category: 'Jedzenie' }] },
  { transactionId: 25, date: '2026-05-25', description: 'Apteka', amount: -96.50, paidFrom: 'KONTO_WSPOLNE', paidTo: 'APTEKA', direction: 'EXPENSE', status: 'CLASSIFIED', items: [{ id: 251, amount: -96.50, wallet: 'BUDZET_DOMOWY', concern: 'TOSIA', category: 'Zdrowie' }] },
  { transactionId: 26, date: '2026-05-25', description: 'Gra komputerowa', amount: -249, paidFrom: 'KONTO_MACKA', paidTo: 'STEAM', direction: 'EXPENSE', status: 'CLASSIFIED', items: [{ id: 261, amount: -249, wallet: 'PORTFEL_MACKA', concern: 'MACIEJ', category: 'Rozrywka' }] },
  { transactionId: 27, date: '2026-05-24', description: 'Podatek od nieruchomości', amount: -720, paidFrom: 'KONTO_WSPOLNE', paidTo: 'URZAD_SKARBOWY', direction: 'EXPENSE', status: 'CLASSIFIED', items: [{ id: 271, amount: -720, wallet: 'BUDZET_DOMOWY', concern: 'WSPOLNE', category: 'Rachunki' }] },
  { transactionId: 28, date: '2026-05-24', description: 'Węgiel / opał', amount: -1800, paidFrom: 'KONTO_WSPOLNE', paidTo: 'DOSTAWCA_OPALU', direction: 'EXPENSE', status: 'PARTIALLY_CLASSIFIED', items: [{ id: 281, amount: -700, wallet: 'BUDZET_DOMOWY', concern: 'WSPOLNE', category: 'Rachunki' }, { id: 282, amount: -1100, wallet: 'SALON_FRYZJERSKI', concern: 'SALON', category: 'Rachunki' }] },
  { transactionId: 29, date: '2026-05-23', description: 'Nieznana transakcja z importu', amount: -73.20, paidFrom: 'KONTO_WSPOLNE', paidTo: 'NIEZNANY', direction: 'EXPENSE', status: 'UNCLASSIFIED', unassigned: true, items: [{ id: 291, amount: -73.20 }] },
]
