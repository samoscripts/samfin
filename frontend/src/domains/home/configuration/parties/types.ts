export type PartyType = 'PERSON' | 'COMPANY' | 'SHOP' | 'INSTITUTION' | 'ACCOUNT' | 'CASH' | 'OTHER'
export type OwnershipType = 'OWN' | 'EXTERNAL'

export interface Party {
  id: number
  name: string
  type: PartyType
  ownershipType: OwnershipType
  description: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface PartyBankAccount {
  id: number
  partyId: number
  partyName: string | null
  bankName: string | null
  accountNumber: string
  displayName: string | null
  ownerNameFromBank: string | null
  currency: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export type PartyPayload = {
  name: string
  type: PartyType
  ownershipType: OwnershipType
  description: string | null
  active: boolean
}

export type PartyBankAccountPayload = {
  partyId: number
  bankName: string | null
  accountNumber: string
  displayName: string | null
  ownerNameFromBank: string | null
  currency: string
  active: boolean
}

export const PARTY_TYPE_LABELS: Record<PartyType, string> = {
  PERSON: 'Osoba',
  COMPANY: 'Firma',
  SHOP: 'Sklep',
  INSTITUTION: 'Instytucja',
  ACCOUNT: 'Rachunek bankowy',
  CASH: 'Gotówka',
  OTHER: 'Inne',
}

export const OWNERSHIP_TYPE_LABELS: Record<OwnershipType, string> = {
  OWN: 'Własny',
  EXTERNAL: 'Zewnętrzny',
}

export const PARTY_TYPE_COLORS: Record<PartyType, string> = {
  PERSON: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  COMPANY: 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  SHOP: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  INSTITUTION: 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
  ACCOUNT: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  CASH: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
  OTHER: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}
