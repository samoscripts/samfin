import { clearStoredToken } from '@/mobile/tokenStorage'
import type { RestoreResult } from '@/shared/api/backups'

/** Po restore cała baza (w tym tokeny API) jest nadpisana — wymagane ponowne logowanie. */
export async function completeRestoreSession(result: RestoreResult): Promise<void> {
  if (!result.requiresRelogin) {
    return
  }

  await clearStoredToken()
  window.location.href = '/?restored=1'
}
