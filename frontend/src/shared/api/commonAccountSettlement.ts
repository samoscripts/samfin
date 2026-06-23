import api from './client'

export interface SettlementConfig {
  commonAccountPartyId: number | null
  homeBudgetWalletId: number | null
  baseDepositAmount: number
  maciekSourcePartyIds: number[]
  basiaSourcePartyIds: number[]
  walletSettlementOwner: Record<string, 'maciek' | 'basia'>
  defaultNextDepositor: 'maciek' | 'basia'
  carryOverMaciek: number
  carryOverBasia: number
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
  type?: string
  reason?: string
}

export interface CommonAccountSettlementResponse {
  dateFrom: string
  dateTo: string
  config: SettlementConfig
  corrections: { total: number; items: SettlementItemRef[] }
  correctionsByPerson: { maciek: number; basia: number }
  unassignedCorrections: number
  deposits: {
    maciek: { total: number; items: SettlementItemRef[] }
    basia: { total: number; items: SettlementItemRef[] }
    other: { total: number; items: SettlementItemRef[] }
  }
  expensesFromCommon: Record<string, { walletId: number | null; total: number; count: number }>
  nextDeposit: {
    person: 'maciek' | 'basia'
    baseAmount: number
    corrections: number
    correctionsDetail: { assigned: number; unassigned: number }
    carryOver: number
    dueAmount: number
    paidInPeriod: number
    balance: number
    underpayment: number
    overpayment: number
    carryForward: number
  }
  balances: Record<string, {
    correctionsAssigned: number
    carryOver: number
    paidInPeriod: number
  }>
  warnings: string[]
  excludedItemsCount: number
}

export interface CommonAccountSettlementParams {
  year?: number
  month?: number
  dateFrom?: string
  dateTo?: string
  nextDepositor?: 'maciek' | 'basia'
  includePartial?: boolean
}

export const fetchSettlementConfig = async (): Promise<SettlementConfig> =>
  (await api.get<SettlementConfig>('/reports/common-account-settlement/config')).data

export const updateSettlementConfig = async (payload: Partial<SettlementConfig>): Promise<SettlementConfig> =>
  (await api.put<SettlementConfig>('/reports/common-account-settlement/config', payload)).data

export const fetchCommonAccountSettlement = async (
  params: CommonAccountSettlementParams,
): Promise<CommonAccountSettlementResponse> =>
  (await api.get<CommonAccountSettlementResponse>('/reports/common-account-settlement', { params })).data
