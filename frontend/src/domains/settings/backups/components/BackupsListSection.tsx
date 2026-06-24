import { useCallback, useEffect, useState } from 'react'
import { Download, HardDriveDownload, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import Modal from '@/shared/components/Modal'
import {
  createBackup,
  deleteBackup,
  downloadBackup,
  fetchBackups,
  restoreBackupFromServer,
  type BackupEntry,
} from '@/shared/api/backups'
import { getApiErrorMessage } from '@/shared/utils/errors'
import SystemSection from '../../system/components/SystemSection'
import SystemOptionRow from '../../system/components/SystemOptionRow'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pl-PL')
  } catch {
    return iso
  }
}

export default function BackupsListSection() {
  const [backups, setBackups] = useState<BackupEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [restoreId, setRestoreId] = useState<string | null>(null)
  const [restoreConfirm, setRestoreConfirm] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const load = useCallback(() => {
    setIsLoading(true)
    fetchBackups()
      .then(setBackups)
      .catch(() => setBackups([]))
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleCreate = async () => {
    setError('')
    setSuccessMessage('')
    setIsCreating(true)
    try {
      const entry = await createBackup()
      setSuccessMessage(`Utworzono kopię: ${entry.filename}`)
      load()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Nie udało się utworzyć kopii.'))
    } finally {
      setIsCreating(false)
    }
  }

  const handleDownload = async (id: string) => {
    setError('')
    setBusyId(id)
    try {
      await downloadBackup(id)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Nie udało się pobrać kopii.'))
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setError('')
    setBusyId(deleteId)
    try {
      await deleteBackup(deleteId)
      setDeleteId(null)
      setSuccessMessage('Kopia została usunięta.')
      load()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Nie udało się usunąć kopii.'))
    } finally {
      setBusyId(null)
    }
  }

  const handleRestore = async () => {
    if (!restoreId) return
    setError('')
    setBusyId(restoreId)
    try {
      await restoreBackupFromServer(restoreId, restoreConfirm)
      setRestoreId(null)
      setRestoreConfirm('')
      setSuccessMessage('Baza została przywrócona z kopii na serwerze.')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Nie udało się przywrócić bazy.'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <SystemSection title="Kopie na serwerze">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800/80">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Backupy hostingu obejmują infrastrukturę; ta sekcja służy do eksportu i importu danych aplikacji.
            Kopie zapisywane są w <code className="text-xs">var/backups/</code> na serwerze.
          </p>
        </div>

        {(error || successMessage) && (
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800/80">
            {error && (
              <div className="px-3 py-2 rounded-lg text-sm bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900">
                {error}
              </div>
            )}
            {successMessage && (
              <div className="mt-2 px-3 py-2 rounded-lg text-sm bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900">
                {successMessage}
              </div>
            )}
          </div>
        )}

        <SystemOptionRow
          title="Utwórz kopię bazy"
          description="Pełny dump MySQL/MariaDB zapakowany w ZIP (SQL + manifest)."
          action={
            <button
              type="button"
              onClick={handleCreate}
              disabled={isCreating || busyId !== null}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {isCreating ? <Loader2 size={15} className="animate-spin" /> : <HardDriveDownload size={15} />}
              Utwórz kopię
            </button>
          }
        />

        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Zapisane kopie</h3>
            <button
              type="button"
              onClick={load}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
              Odśwież
            </button>
          </div>

          {isLoading ? (
            <p className="text-sm text-gray-500">Ładowanie…</p>
          ) : backups.length === 0 ? (
            <p className="text-sm text-gray-500">Brak kopii na serwerze.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                    <th className="py-2 pr-3 font-medium">Data</th>
                    <th className="py-2 pr-3 font-medium">Wersja</th>
                    <th className="py-2 pr-3 font-medium">Build</th>
                    <th className="py-2 pr-3 font-medium">Rozmiar</th>
                    <th className="py-2 font-medium text-right">Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((b) => (
                    <tr key={b.id} className="border-b border-gray-50 dark:border-gray-800/60">
                      <td className="py-2.5 pr-3 whitespace-nowrap">{formatDate(b.createdAt)}</td>
                      <td className="py-2.5 pr-3">{b.version ?? '—'}</td>
                      <td className="py-2.5 pr-3 font-mono text-xs">{b.build ?? '—'}</td>
                      <td className="py-2.5 pr-3">{formatBytes(b.sizeBytes)}</td>
                      <td className="py-2.5 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            title="Pobierz"
                            onClick={() => handleDownload(b.id)}
                            disabled={busyId !== null}
                            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                          >
                            {busyId === b.id ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                          </button>
                          <button
                            type="button"
                            title="Przywróć"
                            onClick={() => { setRestoreId(b.id); setRestoreConfirm('') }}
                            disabled={busyId !== null}
                            className="p-1.5 rounded hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-700 dark:text-amber-400 disabled:opacity-50"
                          >
                            <HardDriveDownload size={15} />
                          </button>
                          <button
                            type="button"
                            title="Usuń"
                            onClick={() => setDeleteId(b.id)}
                            disabled={busyId !== null}
                            className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 disabled:opacity-50"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </SystemSection>

      <ConfirmDialog
        open={deleteId !== null}
        title="Usunąć kopię zapasową?"
        message="Plik zostanie trwale usunięty z serwera."
        confirmLabel="Usuń"
        cancelLabel="Anuluj"
        loading={busyId === deleteId}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      <Modal
        open={restoreId !== null}
        title="Przywrócić bazę z tej kopii?"
        titleId="restore-backup-title"
        onClose={() => { setRestoreId(null); setRestoreConfirm('') }}
        closeDisabled={busyId === restoreId}
        showCloseButton={false}
        size="sm"
        zIndexClass="z-[60]"
      >
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          Operacja nadpisze całą bazę danych. Przed przywróceniem tworzona jest automatyczna kopia w var/backups/pre-restore/.
        </p>
        <label className="block mt-3 text-sm">
          <span className="text-gray-600 dark:text-gray-400">Wpisz PRZYWRÓĆ lub PRZYWRÓĆ MIMO NIEZGODNOŚCI</span>
          <input
            type="text"
            value={restoreConfirm}
            onChange={(e) => setRestoreConfirm(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            autoComplete="off"
          />
        </label>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => { setRestoreId(null); setRestoreConfirm('') }}
            disabled={busyId === restoreId}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-60"
          >
            Anuluj
          </button>
          <button
            type="button"
            onClick={handleRestore}
            disabled={busyId === restoreId || (restoreConfirm !== 'PRZYWRÓĆ' && restoreConfirm !== 'PRZYWRÓĆ MIMO NIEZGODNOŚCI')}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-60"
            style={{ backgroundColor: '#1c4230' }}
          >
            {busyId === restoreId && <Loader2 size={14} className="animate-spin" />}
            Przywróć
          </button>
        </div>
      </Modal>
    </>
  )
}
