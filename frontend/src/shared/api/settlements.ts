import api from './client'

export interface SettlementConfig {
  settlementPartyId: number | null
  homeBudgetWalletId: number | null
  baseDepositAmount: number
  maciekSourcePartyIds: number[]
  basiaSourcePartyIds: number[]
  walletSettlementOwner: Record<string, 'maciek' | 'basia'>
  defaultNextDepositor: 'maciek' | 'basia'
  /** @deprecated legacy — użyj openingRotationCarry */
  carryOverMaciek: number
  /** @deprecated legacy — użyj openingRotationCarry */
  carryOverBasia: number
  reindexFromDate: string | null
  openingWalletBalances: Record<string, number>
  /** @deprecated zawsze 0 — nie używane przy reindeksie */
  openingRotationCarry: number
  openingRotationPrepaidMaciek: number
  openingRotationPrepaidBasia: number
  openingNextDepositor: 'maciek' | 'basia'
  needsRefresh: boolean
  refreshInProgress: boolean
  lastRefreshedAt: string | null
  lastRefreshStats: { factsIndexed?: number; skippedCount?: number; refreshedAt?: string } | null
  configVersion: string | null
}

export interface SettlementItemRef {
  transactionId: number
  itemId: number
  date: string
  description: string | null
  paidFrom: string | null
  paidTo: string | null
  wallet: string | null
  amount: number
  kind?: string
}

export interface WalletGroupBucket {
  total: number
  items: SettlementItemRef[]
}

export interface WalletSettlementGroup {
  expenses: WalletGroupBucket
  incomes: WalletGroupBucket
  net: number
}

export type WalletGroupKey = 'maciek' | 'basia' | 'other'

export type PersonKey = 'maciek' | 'basia'

export interface SettlementRotationState {
  anchor: PersonKey
  baseAmount: number
  maciekDepositsTotal: number
  basiaDepositsTotal: number
  stanMaciek: number
  stanBasia: number
  asOfDate?: string
}

export interface SettlementAfterAnchorSimulation {
  anchorPerson: PersonKey
  anchorPaidAmount: number
  suggestedAmount: number
  catchUpAmount: number
  walletNetCumulative: number
  rotationPrepaid: number
  formulaSummary: string
}

export interface SettlementPersonOutlook {
  isAnchor: boolean
  suggestedAmount: number
  suggestedAmountRaw: number
  catchUpAmount: number
  walletNetCumulative: number
  walletNetInPeriod: number
  rotationPrepaid: number
  formulaSummary: string
  walletBreakdown: { walletId: number; balance: number }[]
  afterAnchorDepositSimulation?: SettlementAfterAnchorSimulation
}

export interface SettlementPeriodInfo {
  year: number
  dateFrom: string
  dateTo: string
  status: 'open' | 'closed'
  closedAt: string | null
  effectiveFrom?: string
  effectiveTo?: string
}

export interface SettlementPeriodsResponse {
  periods: SettlementPeriodInfo[]
  currentYear: number
  firstYear: number
}

export interface SettlementReportResponse {
  dateFrom: string
  dateTo: string
  settlementYear?: number
  settlementPeriod?: SettlementPeriodInfo
  config: SettlementConfig
  walletGroups: Record<WalletGroupKey, WalletSettlementGroup>
  standardDeposits: {
    maciek: WalletGroupBucket
    basia: WalletGroupBucket
  }
  sourceExpenseDeposits: {
    maciek: WalletGroupBucket
    basia: WalletGroupBucket
  }
  rotation: SettlementRotationState
  personOutlook: Record<PersonKey, SettlementPersonOutlook>
  warnings: string[]
  excludedItemsCount: number
  indexState?: {
    needsRefresh: boolean
    refreshInProgress: boolean
    lastRefreshedAt: string | null
    lastRefreshStats: SettlementConfig['lastRefreshStats']
  }
}

export interface SettlementReportParams {
  settlementYear?: number
  year?: number
  month?: number
  dateFrom?: string
  dateTo?: string
  nextDepositor?: 'maciek' | 'basia'
  includePartial?: boolean
}

export interface SettlementRefreshResponse {
  ok: boolean
  config: SettlementConfig
  factsIndexed: number
  skippedCount: number
  refreshedAt: string
}

export const fetchSettlementConfig = async (): Promise<SettlementConfig> =>
  (await api.get<SettlementConfig>('/reports/settlements/config')).data

export const updateSettlementConfig = async (payload: Partial<SettlementConfig>): Promise<SettlementConfig> =>
  (await api.put<SettlementConfig>('/reports/settlements/config', payload)).data

export const fetchSettlementPeriods = async (): Promise<SettlementPeriodsResponse> =>
  (await api.get<SettlementPeriodsResponse>('/reports/settlements/periods')).data

export const fetchSettlementReport = async (
  params: SettlementReportParams,
): Promise<SettlementReportResponse> =>
  (await api.get<SettlementReportResponse>('/reports/settlements', { params })).data

export const refreshSettlementIndex = async (): Promise<SettlementRefreshResponse> =>
  (await api.post<SettlementRefreshResponse>('/reports/settlements/refresh')).data
