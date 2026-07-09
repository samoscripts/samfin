import type { RuleCondition } from '@/shared/api/classificationRules'

import type { Category } from '@/shared/api/categories'

import type { Party } from '@/domains/home/configuration/general/parties/types'

import type { Transaction } from '@/shared/types'

import { DEFAULT_SPLIT_PERCENT } from '@/shared/utils/splitAllocation'

import {

  applyOwnSideToActions,

  defaultForm,

  type FormState,

  type RuleDirection,

} from '../constants'

import { createDirectionCondition } from '../ruleConditionMeta'

import { transactionPrimaryLabel } from '@/domains/home/transactions/utils/transactionDisplay'



export interface TransactionConditionSeeds {

  transTitle: boolean

  transDescription: boolean

  counterparty: boolean

  counterpartyName: boolean

}



export interface RuleFromTransactionDraft {

  contextPartyId: number

  form: FormState

  createdFromTransactionId: number

  transactionSeeds: TransactionConditionSeeds

}



export interface CreateRuleFromTransactionState {

  fromTransaction: Transaction

}



const RULE_NAME_MAX_LENGTH = 120

const CONDITION_VALUE_MAX_LENGTH = 30



export function transactionTitleConditionValue(tx: Transaction): string {

  const source = tx.transTitle?.trim() || transactionPrimaryLabel(tx) || ''

  return source.slice(0, CONDITION_VALUE_MAX_LENGTH)

}



export function transactionDescriptionConditionValue(tx: Transaction): string {

  return (tx.transDescription ?? '').slice(0, CONDITION_VALUE_MAX_LENGTH)

}



export function suggestRuleDescriptionFromTransaction(tx: Transaction): string | null {

  const value = transactionTitleConditionValue(tx)

  return value !== '' ? value : null

}



function firstTransactionCategoryId(tx: Transaction): number | null {

  for (const item of tx.items) {

    if (item.categoryId != null) return item.categoryId

  }

  return null

}



export function formatRuleNameFromCategoryId(

  categoryId: number | null | undefined,

  categories: Category[],

): string | null {

  if (categoryId == null) return null

  const cat = categories.find((c) => c.id === categoryId)

  if (!cat) return null

  if (cat.parentId != null && cat.parentName) {

    return `${cat.parentName}/${cat.name}`.slice(0, RULE_NAME_MAX_LENGTH)

  }

  return cat.name.slice(0, RULE_NAME_MAX_LENGTH)

}



function suggestRuleName(tx: Transaction, categories: Category[]): string {

  const categoryId = firstTransactionCategoryId(tx)

  const fromCategory = formatRuleNameFromCategoryId(categoryId, categories)

  if (fromCategory) return fromCategory

  return `Reguła z transakcji #${tx.transactionId}`

}



export function getRuleContextPartyId(tx: Transaction): number | null {

  if (tx.direction === 'EXPENSE') return tx.paidFromPartyId ?? null

  if (tx.direction === 'INCOME') return tx.paidToPartyId ?? null

  return null

}



export function canCreateRuleFromTransaction(tx: Transaction, ruleContextParties: Party[]): boolean {

  const partyId = getRuleContextPartyId(tx)

  if (partyId === null) return false

  return ruleContextParties.some((p) => p.id === partyId)

}



function transactionItemsToRuleItems(tx: Transaction): FormState['actions']['items'] {

  const raw =

    tx.items.length > 0

      ? tx.items

      : [{ amount: tx.amount, walletId: null, concernId: null, categoryId: null }]



  if (raw.length === 1) {

    return [

      {

        percent: 100,

        walletId: raw[0].walletId ?? null,

        concernId: raw[0].concernId ?? null,

        categoryId: raw[0].categoryId ?? null,

      },

    ]

  }



  if (raw.length === 2) {

    const absTotal = Math.abs(tx.amount)

    const p0 =

      absTotal > 0

        ? Math.round((Math.abs(raw[0].amount ?? 0) / absTotal) * 100)

        : DEFAULT_SPLIT_PERCENT

    return [

      {

        percent: p0,

        walletId: raw[0].walletId ?? null,

        concernId: raw[0].concernId ?? null,

        categoryId: raw[0].categoryId ?? null,

      },

      {

        percent: 100 - p0,

        walletId: raw[1].walletId ?? null,

        concernId: raw[1].concernId ?? null,

        categoryId: raw[1].categoryId ?? null,

      },

    ]

  }



  return raw.map((item) => ({

    percent: 100,

    walletId: item.walletId ?? null,

    concernId: item.concernId ?? null,

    categoryId: item.categoryId ?? null,

  }))

}



function buildConditions(tx: Transaction): RuleCondition[] {

  const direction = tx.direction as RuleDirection

  const titleValue = transactionTitleConditionValue(tx)

  const conditions: RuleCondition[] = [createDirectionCondition(direction)]



  if (titleValue !== '') {

    conditions.push({

      field: 'trans_title',

      operator: 'starts_with',

      value: titleValue,

      caseInsensitive: true,

    })

  }



  if (tx.counterpartyAccountNumber?.trim()) {

    conditions.push({

      field: 'counterparty_account_number',

      operator: 'equals',

      value: tx.counterpartyAccountNumber.trim(),

      caseInsensitive: false,

    })

  } else if (tx.counterpartyName?.trim()) {

    conditions.push({

      field: 'counterparty_name',

      operator: 'contains',

      value: tx.counterpartyName.trim().slice(0, CONDITION_VALUE_MAX_LENGTH),

      caseInsensitive: true,

    })

  }



  return conditions

}



export function buildRuleDraftFromTransaction(

  tx: Transaction,

  categories: Category[],

): RuleFromTransactionDraft | null {

  const contextPartyId = getRuleContextPartyId(tx)

  if (contextPartyId === null) return null



  const direction = tx.direction as RuleDirection

  const titleValue = transactionTitleConditionValue(tx)



  const actions = applyOwnSideToActions(

    {

      transaction: {

        paidFromPartyId: tx.paidFromPartyId ?? null,

        paidToPartyId: tx.paidToPartyId ?? null,

      },

      items: transactionItemsToRuleItems(tx),

    },

    direction,

    contextPartyId,

  )



  const form: FormState = {

    ...defaultForm(),

    name: suggestRuleName(tx, categories),

    description: suggestRuleDescriptionFromTransaction(tx),

    conditions: { conditions: buildConditions(tx) },

    actions,

    createdFromTransactionId: tx.transactionId,

  }



  return {

    contextPartyId,

    form,

    createdFromTransactionId: tx.transactionId,

    transactionSeeds: {

      transDescription: (tx.transDescription ?? '').trim() !== '',

      transTitle: titleValue !== '',

      counterparty: Boolean(tx.counterpartyAccountNumber?.trim()),

      counterpartyName: Boolean(tx.counterpartyName?.trim()),

    },

  }

}


