import type {
  BreakdownDirection,
  BreakdownGroup,
  BreakdownGroupBy,
  BreakdownReportData,
} from '@/domains/home/reports/shared/types/breakdown'

interface MockParams {
  dateFrom: string
  dateTo: string
  groupBy: BreakdownGroupBy
  direction: BreakdownDirection
  categoryId?: string
  walletId?: string
}

const EXPENSE_MAIN: BreakdownGroup[] = [
  {
    id: 1,
    name: 'Żywność',
    amount: 1240.5,
    share: 25.7,
    itemCount: 34,
    children: [
      { id: 11, name: 'Pieczywo', parentId: 1, amount: 320.0, share: 6.6, itemCount: 12 },
      { id: 12, name: 'Warzywa i owoce', parentId: 1, amount: 410.5, share: 8.5, itemCount: 11 },
      { id: 13, name: 'Mięso i nabiał', parentId: 1, amount: 510.0, share: 10.6, itemCount: 11 },
    ],
  },
  {
    id: 2,
    name: 'Transport',
    amount: 890.25,
    share: 18.5,
    itemCount: 28,
    children: [
      { id: 21, name: 'Paliwo', parentId: 2, amount: 620.0, share: 12.9, itemCount: 14 },
      { id: 22, name: 'Komunikacja', parentId: 2, amount: 270.25, share: 5.6, itemCount: 14 },
    ],
  },
  {
    id: 3,
    name: 'Dom',
    amount: 756.8,
    share: 15.7,
    itemCount: 22,
    children: [
      { id: 31, name: 'Media', parentId: 3, amount: 480.0, share: 10.0, itemCount: 8 },
      { id: 32, name: 'Remont', parentId: 3, amount: 276.8, share: 5.7, itemCount: 14 },
    ],
  },
  {
    id: 4,
    name: 'Rozrywka',
    amount: 542.3,
    share: 11.3,
    itemCount: 18,
    children: [
      { id: 41, name: 'Kino i streaming', parentId: 4, amount: 198.3, share: 4.1, itemCount: 9 },
      { id: 42, name: 'Restauracje', parentId: 4, amount: 344.0, share: 7.2, itemCount: 9 },
    ],
  },
  {
    id: 5,
    name: 'Zdrowie',
    amount: 318.9,
    share: 6.6,
    itemCount: 9,
    children: [
      { id: 51, name: 'Apteka', parentId: 5, amount: 218.9, share: 4.5, itemCount: 6 },
      { id: 52, name: 'Wizyty', parentId: 5, amount: 100.0, share: 2.1, itemCount: 3 },
    ],
  },
  {
    id: null,
    name: 'Bez kategorii',
    amount: 120.0,
    share: 2.5,
    itemCount: 3,
  },
]

const EXPENSE_WALLETS: BreakdownGroup[] = [
  { id: 1, name: 'Budżet domowy', amount: 2840.5, share: 59.0, itemCount: 78 },
  { id: 2, name: 'Maciek', amount: 1120.25, share: 23.2, itemCount: 28 },
  { id: 3, name: 'Basia', amount: 857.0, share: 17.8, itemCount: 21 },
]

const EXPENSE_CONCERNS: BreakdownGroup[] = [
  { id: 1, name: 'Dom', amount: 3120.0, share: 64.7, itemCount: 85 },
  { id: 2, name: 'Samochód', amount: 980.5, share: 20.3, itemCount: 24 },
  { id: 3, name: 'Osobiste', amount: 717.25, share: 14.9, itemCount: 18 },
]

const INCOME_MAIN: BreakdownGroup[] = [
  { id: 10, name: 'Wynagrodzenie', amount: 12500.0, share: 78.1, itemCount: 2 },
  { id: 11, name: 'Zwroty', amount: 1850.0, share: 11.6, itemCount: 5 },
  { id: 12, name: 'Inne przychody', amount: 1650.0, share: 10.3, itemCount: 4 },
]

const INCOME_WALLETS: BreakdownGroup[] = [
  { id: 1, name: 'Budżet domowy', amount: 14200.0, share: 88.8, itemCount: 8 },
  { id: 2, name: 'Maciek', amount: 1200.0, share: 7.5, itemCount: 2 },
  { id: 3, name: 'Basia', amount: 600.0, share: 3.7, itemCount: 1 },
]

const CATEGORY_CHILDREN: Record<string, BreakdownGroup[]> = {
  '1': EXPENSE_MAIN[0].children ?? [],
  '2': EXPENSE_MAIN[1].children ?? [],
  '3': EXPENSE_MAIN[2].children ?? [],
  '4': EXPENSE_MAIN[3].children ?? [],
  '5': EXPENSE_MAIN[4].children ?? [],
}

function scaleGroups(groups: BreakdownGroup[], factor: number): BreakdownGroup[] {
  return groups.map((g) => ({
    ...g,
    amount: Math.round(g.amount * factor * 100) / 100,
    children: g.children?.map((c) => ({
      ...c,
      amount: Math.round(c.amount * factor * 100) / 100,
    })),
  }))
}

function sumGroups(groups: BreakdownGroup[]): { total: number; itemCount: number; unclassified: number } {
  let total = 0
  let itemCount = 0
  let unclassified = 0
  for (const g of groups) {
    total += g.amount
    itemCount += g.itemCount
    if (g.id === null) unclassified += g.amount
  }
  return { total, itemCount, unclassified }
}

function withShares(groups: BreakdownGroup[], total: number): BreakdownGroup[] {
  return groups.map((g) => ({
    ...g,
    share: total > 0 ? Math.round((g.amount / total) * 1000) / 10 : 0,
  }))
}

export function getBreakdownMockData(params: MockParams): BreakdownReportData {
  const { dateFrom, dateTo, groupBy, direction, categoryId, walletId } = params
  const walletFactor = walletId === '1' ? 0.62 : walletId === '2' ? 0.25 : walletId === '3' ? 0.18 : 1

  let groups: BreakdownGroup[]

  if (direction === 'INCOME') {
    if (groupBy === 'wallet') groups = scaleGroups(INCOME_WALLETS, walletFactor)
    else groups = scaleGroups(INCOME_MAIN, walletFactor)
  } else if (groupBy === 'wallet') {
    groups = scaleGroups(EXPENSE_WALLETS, walletFactor)
  } else if (groupBy === 'concern') {
    groups = scaleGroups(EXPENSE_CONCERNS, walletFactor)
  } else if (groupBy === 'categorySub' && categoryId && CATEGORY_CHILDREN[categoryId]) {
    groups = scaleGroups(CATEGORY_CHILDREN[categoryId], walletFactor)
  } else {
    groups = scaleGroups(EXPENSE_MAIN, walletFactor)
  }

  const { total, itemCount, unclassified } = sumGroups(groups)
  const adjustedTotal = Math.round(total * 100) / 100

  return {
    dateFrom,
    dateTo,
    groupBy,
    direction,
    total: adjustedTotal,
    itemCount,
    averageAmount: itemCount > 0 ? Math.round((adjustedTotal / itemCount) * 100) / 100 : 0,
    unclassifiedAmount: Math.round(unclassified * 100) / 100,
    groups: withShares(groups, adjustedTotal),
  }
}
