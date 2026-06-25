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

export interface SettlementNextDeposit {
  person: 'maciek' | 'basia'
  baseAmount: number
  walletNet: number
  rotationCarry: number
  rotationPrepaid: number
  suggestedAmount: number
  suggestedAmountRaw?: number
  overpaymentCredit?: number
  corrections: number
  carryOver: number
  dueAmount: number
  paidInPeriod: number
  balance: number
  underpayment: number
  overpayment: number
  carryForward: number
  walletBreakdown?: { walletId: number; balance: number }[]
}

export interface SettlementReportResponse {
  dateFrom: string
  dateTo: string
  config: SettlementConfig
  walletGroups: Record<WalletGroupKey, WalletSettlementGroup>
  standardDeposits: {
    maciek: WalletGroupBucket
    basia: WalletGroupBucket
  }
  nextDeposit: SettlementNextDeposit
  balances: Record<string, {
    walletNet: number
    carryOver: number
    paidInPeriod: number
    walletNetLedger?: number
  }>
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

export const fetchSettlementReport = async (
  params: SettlementReportParams,
): Promise<SettlementReportResponse> =>
  (await api.get<SettlementReportResponse>('/reports/settlements', { params })).data

export const refreshSettlementIndex = async (): Promise<SettlementRefreshResponse> =>
  (await api.post<SettlementRefreshResponse>('/reports/settlements/refresh')).data
