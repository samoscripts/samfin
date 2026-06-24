import type { RestoreResult } from '@/shared/api/backups'

const TOKEN_KEY = 'samfin_token'

/** Po restore cała baza (w tym api_token) jest nadpisana — wymagane ponowne logowanie. */
export function completeRestoreSession(result: RestoreResult): void {
  if (!result.requiresRelogin) {
    return
  }

  localStorage.removeItem(TOKEN_KEY)
  window.location.href = '/?restored=1'
}
