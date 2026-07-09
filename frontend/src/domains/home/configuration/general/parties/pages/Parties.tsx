import { useEffect, useState } from 'react'
import { Plus, Pencil, X, Loader2, ChevronRight } from 'lucide-react'
import type { Party } from '../types'
import {
  PARTY_TYPE_LABELS,
  OWNERSHIP_TYPE_LABELS,
} from '../types'
import Pill from '@/shared/components/Pill'
import { fetchParties, fetchParty, deactivateParty } from '@/shared/api/parties'
import { useCrudRoute } from '@/shared/hooks/useCrudRoute'
import PartyForm from '../components/PartyForm'
import PartyBankAccountsSection from '../components/PartyBankAccountsSection'

const ROUTE_BASE = '/konfiguracja/ogolne/podmioty'

export default function Parties() {
  const { isList, isCreate, isEdit, entityId, goList, goCreate, goEdit } = useCrudRoute(ROUTE_BASE)

  const [parties, setParties] = useState<Party[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingParty, setEditingParty] = useState<Party | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [deactivating, setDeactivating] = useState<number | null>(null)

  useEffect(() => {
    if (!isList) return
    setIsLoading(true)
    fetchParties()
      .then(setParties)
      .finally(() => setIsLoading(false))
  }, [isList])

  useEffect(() => {
    if (!isEdit || entityId === null) {
      setEditingParty(null)
      return
    }

    const fromList = parties.find((p) => p.id === entityId)
    if (fromList) {
      setEditingParty(fromList)
      return
    }

    let cancelled = false
    setEditLoading(true)
    fetchParty(entityId)
      .then((party) => {
        if (!cancelled) setEditingParty(party)
      })
      .catch(() => {
        if (!cancelled) setEditingParty(null)
      })
      .finally(() => {
        if (!cancelled) setEditLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isEdit, entityId, parties])

  async function handleDeactivate(party: Party) {
    if (!confirm(`Dezaktywować podmiot „${party.name}"?`)) return
    setDeactivating(party.id)
    try {
      await deactivateParty(party.id)
      setParties((prev) => prev.map((p) => (p.id === party.id ? { ...p, active: false } : p)))
    } finally {
      setDeactivating(null)
    }
  }

  function handleSaved(saved: Party) {
    if (isCreate) {
      goList()
    } else {
      setEditingParty(saved)
      setParties((prev) => {
        const idx = prev.findIndex((p) => p.id === saved.id)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = saved
          return next
        }
        return prev
      })
    }
  }

  const breadcrumb = (
    <nav className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 mb-6">
      <button type="button" onClick={goList} className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
        Podmioty
      </button>
      {!isList && (
        <>
          <ChevronRight size={12} className="shrink-0" />
          <span className="text-gray-600 dark:text-gray-400 font-medium">
            {isCreate ? 'Nowy podmiot' : `Edycja: ${editingParty?.name}`}
          </span>
        </>
      )}
    </nav>
  )

  if (isCreate || isEdit) {
    if (isEdit && editLoading) {
      return (
        <div>
          {breadcrumb}
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 size={24} className="animate-spin" />
          </div>
        </div>
      )
    }

    if (isEdit && !editingParty) {
      return (
        <div>
          {breadcrumb}
          <p className="text-sm text-red-600 dark:text-red-400">Nie znaleziono podmiotu.</p>
        </div>
      )
    }

    return (
      <div>
        {breadcrumb}
        <div className="w-full space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {isCreate ? 'Nowy podmiot' : `Edycja: ${editingParty?.name}`}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {isCreate
                ? 'Dodaj osobę, firmę, sklep lub rachunek bankowy uczestniczący w operacjach finansowych.'
                : 'Zaktualizuj dane podmiotu.'}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <PartyForm
              party={isCreate ? null : editingParty}
              onSaved={handleSaved}
              onCancel={goList}
            />
          </div>

          {isEdit && editingParty?.type === 'ACCOUNT' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <PartyBankAccountsSection partyId={editingParty.id} />
            </div>
          )}
        </div>
      </div>
    )
  }

  const active = parties.filter((p) => p.active)
  const inactive = parties.filter((p) => !p.active)

  return (
    <div>
      {breadcrumb}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Podmioty</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Osoby, firmy, sklepy i rachunki uczestniczące w operacjach finansowych.
          </p>
        </div>
        <button
          onClick={goCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1a472a] hover:bg-[#163526] text-white text-sm font-medium transition-colors"
        >
          <Plus size={15} />
          Dodaj podmiot
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {parties.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
              <p className="text-gray-400 dark:text-gray-500 text-sm">
                Brak podmiotów. Kliknij „Dodaj podmiot", aby dodać pierwszy.
              </p>
            </div>
          ) : (
            <>
              <PartiesTable
                parties={active}
                title="Aktywne"
                onEdit={goEdit}
                onDeactivate={handleDeactivate}
                deactivating={deactivating}
              />
              {inactive.length > 0 && (
                <PartiesTable
                  parties={inactive}
                  title="Nieaktywne"
                  onEdit={goEdit}
                  onDeactivate={handleDeactivate}
                  deactivating={deactivating}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

interface PartiesTableProps {
  parties: Party[]
  title: string
  onEdit: (id: number) => void
  onDeactivate: (p: Party) => void
  deactivating: number | null
}

function PartiesTable({ parties, title, onEdit, onDeactivate, deactivating }: PartiesTableProps) {
  if (parties.length === 0) return null

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 px-1">
        {title}
      </h3>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Nazwa</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Typ</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Własność</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Opis</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {parties.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                    {p.name}
                    {p.type === 'ACCOUNT' && (
                      <span className="ml-1.5 text-xs text-gray-400 dark:text-gray-500">🏦</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Pill variant="neutral">{PARTY_TYPE_LABELS[p.type]}</Pill>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={[
                      'text-xs font-medium',
                      p.ownershipType === 'OWN'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-gray-500 dark:text-gray-400',
                    ].join(' ')}>
                      {OWNERSHIP_TYPE_LABELS[p.ownershipType]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs max-w-xs truncate">
                    {p.description ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onEdit(p.id)}
                        title="Edytuj"
                        className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      {p.active && (
                        <button
                          onClick={() => onDeactivate(p)}
                          disabled={deactivating === p.id}
                          title="Dezaktywuj"
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-40"
                        >
                          {deactivating === p.id
                            ? <Loader2 size={14} className="animate-spin" />
                            : <X size={14} />
                          }
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
          {parties.map((p) => (
            <div key={p.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{p.name}</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <Pill variant="neutral">{PARTY_TYPE_LABELS[p.type]}</Pill>
                    <span className={['text-xs font-medium', p.ownershipType === 'OWN' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500'].join(' ')}>
                      {OWNERSHIP_TYPE_LABELS[p.ownershipType]}
                    </span>
                  </div>
                  {p.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{p.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => onEdit(p.id)} className="p-1.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                    <Pencil size={14} />
                  </button>
                  {p.active && (
                    <button
                      onClick={() => onDeactivate(p)}
                      disabled={deactivating === p.id}
                      className="p-1.5 rounded text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-40"
                    >
                      {deactivating === p.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
