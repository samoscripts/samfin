import api from './client'

export interface BackupEntry {
  id: string
  filename: string
  createdAt: string
  sizeBytes: number
  version?: string
  build?: string
  commit?: string
  schemaVersion?: string
  dbEngine?: string
}

export interface RestoreResult {
  restored: boolean
  requiresRelogin?: boolean
  manifest: Record<string, unknown>
}

function parseFilename(contentDisposition: string | undefined, fallback: string): string {
  if (!contentDisposition) return fallback
  const match = /filename="([^"]+)"/.exec(contentDisposition)
  return match?.[1] ?? fallback
}

export async function fetchBackups(): Promise<BackupEntry[]> {
  const res = await api.get<BackupEntry[]>('/system/backups')
  return res.data
}

export async function createBackup(): Promise<BackupEntry> {
  const res = await api.post<BackupEntry>('/system/backups')
  return res.data
}

export async function downloadBackup(id: string): Promise<void> {
  const res = await api.get<Blob>(`/system/backups/${encodeURIComponent(id)}/download`, {
    responseType: 'blob',
  })

  const filename = parseFilename(
    res.headers['content-disposition'] as string | undefined,
    `${id}.zip`,
  )

  const url = URL.createObjectURL(res.data)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export async function deleteBackup(id: string): Promise<void> {
  await api.delete(`/system/backups/${encodeURIComponent(id)}`)
}

export async function restoreBackupFromServer(id: string, confirm: string): Promise<RestoreResult> {
  const res = await api.post<RestoreResult>(`/system/backups/${encodeURIComponent(id)}/restore`, { confirm })
  return res.data
}

export async function restoreBackupFromUpload(file: File, confirm: string): Promise<RestoreResult> {
  const form = new FormData()
  form.append('file', file)
  form.append('confirm', confirm)
  const res = await api.post<RestoreResult>('/system/backups/restore', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}
