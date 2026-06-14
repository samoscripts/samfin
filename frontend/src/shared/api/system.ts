import api from './client'

export interface ClearTransactionsResult {
  deletedCount: number
  importsReset: number
}

function parseFilename(contentDisposition: string | undefined, fallback: string): string {
  if (!contentDisposition) return fallback
  const match = /filename="([^"]+)"/.exec(contentDisposition)
  return match?.[1] ?? fallback
}

export async function exportTransactionsJson(): Promise<void> {
  const res = await api.get<Blob>('/system/transactions/export', {
    responseType: 'blob',
    headers: { Accept: 'application/json' },
  })

  const filename = parseFilename(
    res.headers['content-disposition'] as string | undefined,
    `transactions-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`,
  )

  const url = URL.createObjectURL(res.data)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export async function clearAllTransactions(): Promise<ClearTransactionsResult> {
  const res = await api.delete<ClearTransactionsResult>('/system/transactions')
  return res.data
}
