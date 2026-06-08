// Label maps kept for reference / future use — not used in the main transaction flow anymore.
// Transaction data now comes from GET /api/transactions.

export const STATUS_LABELS: Record<string, string> = {
  UNCLASSIFIED:          'Nieklasyfikowany',
  PARTIALLY_CLASSIFIED:  'Częściowo',
  CLASSIFIED:            'Sklasyfikowany',
}

export const DIRECTION_LABELS: Record<string, string> = {
  EXPENSE: 'Wydatek',
  INCOME:  'Wpływ',
}
