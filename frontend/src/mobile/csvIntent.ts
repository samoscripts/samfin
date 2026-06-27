import { registerPlugin } from '@capacitor/core'

export interface PendingCsvFile {
  fileName?: string
  mimeType?: string
}

export interface CsvFilePayload {
  fileName: string
  mimeType: string
  data: string
}

interface CsvIntentPlugin {
  getPendingFile(): Promise<PendingCsvFile>
  readPendingFile(): Promise<CsvFilePayload>
  clearPendingFile(): Promise<void>
}

const CsvIntent = registerPlugin<CsvIntentPlugin>('CsvIntent')

export async function getPendingCsvMeta(): Promise<PendingCsvFile | null> {
  const meta = await CsvIntent.getPendingFile()
  return meta.fileName ? meta : null
}

export async function readPendingCsv(): Promise<File> {
  const payload = await CsvIntent.readPendingFile()
  const bytes = base64ToUint8Array(payload.data)
  const mime = payload.mimeType || 'text/csv'
  const blob = new Blob([Uint8Array.from(bytes)], { type: mime })
  return new File([blob], payload.fileName, { type: mime })
}

export async function clearPendingCsv(): Promise<void> {
  await CsvIntent.clearPendingFile()
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}
