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
