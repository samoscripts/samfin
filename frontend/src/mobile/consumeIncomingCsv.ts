import { clearPendingCsv, getPendingCsvMeta, readPendingCsv } from './csvIntent'
import { isNativeApp } from './platform'

export interface IncomingCsv {
  file: File
  source: string
  fromIntent?: boolean
}

/** Odczytuje plik CSV z natywnego intentu (mBank → Otwórz za pomocą). */
export async function consumeIncomingCsv(): Promise<IncomingCsv | null> {
  if (!isNativeApp()) {
    return null
  }

  const meta = await getPendingCsvMeta()
  if (!meta?.fileName) {
    return null
  }

  try {
    const file = await readPendingCsv()
    await clearPendingCsv()
    return { file, source: 'MBANK', fromIntent: true }
  } catch {
    await clearPendingCsv()
    return null
  }
}
