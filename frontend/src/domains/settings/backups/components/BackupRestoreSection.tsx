import { useState } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { restoreBackupFromUpload } from '@/shared/api/backups'
import { getApiErrorMessage } from '@/shared/utils/errors'
import { completeRestoreSession } from '../utils/completeRestoreSession'
import SystemSection from '../../system/components/SystemSection'

export default function BackupRestoreSection() {
  const [file, setFile] = useState<File | null>(null)
  const [confirm, setConfirm] = useState('')
  const [isRestoring, setIsRestoring] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const handleRestore = async () => {
    if (!file) {
      setError('Wybierz plik ZIP.')
      return
    }
    if (confirm !== 'PRZYWRÓĆ' && confirm !== 'PRZYWRÓĆ MIMO NIEZGODNOŚCI') {
      setError('Wpisz PRZYWRÓĆ lub PRZYWRÓĆ MIMO NIEZGODNOŚCI.')
      return
    }

    setError('')
    setSuccessMessage('')
    setIsRestoring(true)
    try {
      const result = await restoreBackupFromUpload(file, confirm)
      if (result.requiresRelogin) {
        await completeRestoreSession(result)
        return
      }
      setSuccessMessage('Baza została przywrócona z przesłanego pliku.')
      setFile(null)
      setConfirm('')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Nie udało się przywrócić bazy.'))
    } finally {
      setIsRestoring(false)
    }
  }

  return (
    <SystemSection title="Import / przywróć bazę" defaultOpen={false}>
      <div className="px-4 py-3 space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Prześlij ZIP z innej instancji (np. prod → dev). Import wymaga zgodnej wersji aplikacji i schematu migracji.
          Pliki większe niż 32 MB — użyj CLI: <code className="text-xs">app:database:restore</code>.
        </p>

        {error && (
          <div className="px-3 py-2 rounded-lg text-sm bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="px-3 py-2 rounded-lg text-sm bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900">
            {successMessage}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Plik ZIP
          </label>
          <input
            type="file"
            accept=".zip,application/zip"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-gray-200 dark:file:border-gray-700 file:bg-white dark:file:bg-gray-900 file:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Potwierdzenie
          </label>
          <input
            type="text"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="PRZYWRÓĆ"
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            autoComplete="off"
          />
          <p className="mt-1 text-xs text-gray-500">
            PRZYWRÓĆ MIMO NIEZGODNOŚCI — pomiń walidację wersji/schematu (ryzykowne).
          </p>
        </div>

        <button
          type="button"
          onClick={handleRestore}
          disabled={isRestoring || !file}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
        >
          {isRestoring ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          Przywróć z pliku
        </button>
      </div>
    </SystemSection>
  )
}
