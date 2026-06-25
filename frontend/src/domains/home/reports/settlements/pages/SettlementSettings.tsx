import { useCallback, useEffect, useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import {
  fetchSettlementConfig,
  updateSettlementConfig,
  type SettlementConfig,
} from '@/shared/api/settlements'
import { fetchParties } from '@/shared/api/parties'
import { fetchWallets, type Wallet } from '@/shared/api/wallets'
import type { Party } from '@/domains/home/configuration/parties/types'
import DictionarySelect from '@/shared/components/form/DictionarySelect'
import { getApiErrorMessage } from '@/shared/utils/errors'

type Draft = SettlementConfig

const EMPTY_DRAFT: Draft = {
  settlementPartyId: null,
  homeBudgetWalletId: null,
  baseDepositAmount: 5000,
  maciekSourcePartyIds: [],
  basiaSourcePartyIds: [],
  walletSettlementOwner: {},
  defaultNextDepositor: 'maciek',
  carryOverMaciek: 0,
  carryOverBasia: 0,
  reindexFromDate: null,
  openingWalletBalances: {},
  openingRotationCarry: 0,
  openingRotationPrepaidMaciek: 0,
  openingRotationPrepaidBasia: 0,
  openingNextDepositor: 'maciek',
  needsRefresh: true,
  refreshInProgress: false,
  lastRefreshedAt: null,
  lastRefreshStats: null,
  configVersion: null,
}

export default function SettlementSettings() {
  const [parties, setParties] = useState<Party[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    Promise.all([fetchParties(), fetchWallets(), fetchSettlementConfig()])
      .then(([p, w, cfg]) => {
        setParties(p.filter((x) => x.active))
        setWallets(w.filter((x) => x.active))
        setDraft(cfg)
      })
      .catch(() => setError('Nie udało się załadować konfiguracji.'))
      .finally(() => setLoading(false))
  }, [])

  const toggleParty = useCallback((person: 'maciek' | 'basia', partyId: number) => {
    const key = person === 'maciek' ? 'maciekSourcePartyIds' : 'basiaSourcePartyIds'
    setDraft((prev) => {
      const list = prev[key]
      const next = list.includes(partyId)
        ? list.filter((id) => id !== partyId)
        : [...list, partyId]
      return { ...prev, [key]: next }
    })
  }, [])

  const setWalletOwner = useCallback((walletId: number, owner: 'maciek' | 'basia' | '') => {
    setDraft((prev) => {
      const next = { ...prev.walletSettlementOwner }
      if (owner === '') {
        delete next[String(walletId)]
      } else {
        next[String(walletId)] = owner
      }
      return { ...prev, walletSettlementOwner: next }
    })
  }, [])

  const setOpeningWalletBalance = useCallback((walletId: number, amount: number) => {
    setDraft((prev) => ({
      ...prev,
      openingWalletBalances: {
        ...prev.openingWalletBalances,
        [String(walletId)]: amount,
      },
    }))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const saved = await updateSettlementConfig(draft)
      setDraft(saved)
      setSuccess(true)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Nie udało się zapisać konfiguracji.'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-gray-400">
        <Loader2 size={24} className="animate-spin" />
      </div>
    )
  }

  const nonHomeWallets = wallets.filter((w) => w.id !== draft.homeBudgetWalletId)

  return (
    <div className="space-y-6 max-w-2xl">
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {success && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">Zapisano konfigurację.</p>
      )}

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-gray-900 dark:text-gray-100">Podstawowe</legend>

        <label className="block text-sm text-gray-600 dark:text-gray-400">
          Podmiot rozliczenia (Dokąd wpłat / Skąd wydatków)
          <div className="mt-1">
            <DictionarySelect
              items={parties}
              value={draft.settlementPartyId ?? ''}
              onChange={(id) => setDraft((p) => ({
                ...p,
                settlementPartyId: id == null ? null : Number(id),
              }))}
              emptyLabel="— wybierz podmiot —"
              valueType="number"
            />
          </div>
        </label>

        <label className="block text-sm text-gray-600 dark:text-gray-400">
          Portfel budżetu domowego
          <div className="mt-1">
            <DictionarySelect
              items={wallets}
              value={draft.homeBudgetWalletId ?? ''}
              onChange={(id) => setDraft((p) => ({
                ...p,
                homeBudgetWalletId: id == null ? null : Number(id),
              }))}
              emptyLabel="— wybierz portfel —"
              valueType="number"
            />
          </div>
        </label>

        <label className="block text-sm text-gray-600 dark:text-gray-400">
          Kwota bazowa wpłaty (PLN)
          <input
            type="number"
            min={1}
            step={100}
            className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            value={draft.baseDepositAmount}
            onChange={(e) => setDraft((p) => ({
              ...p,
              baseDepositAmount: Number(e.target.value),
            }))}
          />
        </label>

        <label className="block text-sm text-gray-600 dark:text-gray-400">
          Domyślna kolejność (gdy brak historii wpłat)
          <select
            className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            value={draft.defaultNextDepositor}
            onChange={(e) => setDraft((p) => ({
              ...p,
              defaultNextDepositor: e.target.value as 'maciek' | 'basia',
            }))}
          >
            <option value="maciek">Maciek</option>
            <option value="basia">Basia</option>
          </select>
        </label>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Źródła wpłat (Skąd) — Maciek
        </legend>
        <PartyChecklist
          parties={parties}
          selected={draft.maciekSourcePartyIds}
          onToggle={(id) => toggleParty('maciek', id)}
        />
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Źródła wpłat (Skąd) — Basia
        </legend>
        <PartyChecklist
          parties={parties}
          selected={draft.basiaSourcePartyIds}
          onToggle={(id) => toggleParty('basia', id)}
        />
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Właściciel korekty per portfel
        </legend>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Wydatki ze wspólnego na portfel inny niż budżet domowy generują korektę.
          Nieprzypisane portfele trafiają do puli następnego wpłacającego.
        </p>
        {nonHomeWallets.length === 0 ? (
          <p className="text-sm text-gray-400">Brak innych portfeli.</p>
        ) : (
          <ul className="space-y-2">
            {nonHomeWallets.map((w) => (
              <li key={w.id} className="flex items-center gap-3 text-sm">
                <span className="flex-1 text-gray-700 dark:text-gray-300">{w.name}</span>
                <select
                  className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm"
                  value={draft.walletSettlementOwner[String(w.id)] ?? ''}
                  onChange={(e) => setWalletOwner(
                    w.id,
                    e.target.value as 'maciek' | 'basia' | '',
                  )}
                >
                  <option value="">— pulą następnego —</option>
                  <option value="maciek">Maciek</option>
                  <option value="basia">Basia</option>
                </select>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Indeks rozliczeń
        </legend>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Po zmianie konfiguracji lub transakcji odśwież indeks w zakładce Raport.
          Transakcje sprzed daty reindeksu nie wchodzą do indeksu. Na start liczą się
          kolej rotacji, prepaid (ręcznie wpisany) i opcjonalnie salda portfeli.
          Prepaid nie jest sumowany automatycznie z wpłat — tylko pola poniżej.
        </p>
        <label className="block text-sm text-gray-600 dark:text-gray-400">
          Data początkowa reindeksu
          <input
            type="date"
            className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            value={draft.reindexFromDate ?? ''}
            onChange={(e) => setDraft((p) => ({
              ...p,
              reindexFromDate: e.target.value || null,
            }))}
          />
        </label>
        <label className="block text-sm text-gray-600 dark:text-gray-400">
          Kolej na start reindeksu
          <select
            className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            value={draft.openingNextDepositor}
            onChange={(e) => setDraft((p) => ({
              ...p,
              openingNextDepositor: e.target.value as 'maciek' | 'basia',
            }))}
          >
            <option value="maciek">Maciek</option>
            <option value="basia">Basia</option>
          </select>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-sm text-gray-600 dark:text-gray-400">
            Prepaid Maciek na start (PLN)
            <input
              type="number"
              min={0}
              step={0.01}
              className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              value={draft.openingRotationPrepaidMaciek}
              onChange={(e) => setDraft((p) => ({
                ...p,
                openingRotationPrepaidMaciek: Number(e.target.value),
              }))}
            />
          </label>
          <label className="text-sm text-gray-600 dark:text-gray-400">
            Prepaid Basia na start (PLN)
            <input
              type="number"
              min={0}
              step={0.01}
              className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              value={draft.openingRotationPrepaidBasia}
              onChange={(e) => setDraft((p) => ({
                ...p,
                openingRotationPrepaidBasia: Number(e.target.value),
              }))}
            />
          </label>
        </div>
        {nonHomeWallets.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Salda portfeli na start reindeksu (PLN)
            </p>
            <ul className="space-y-2">
              {nonHomeWallets.map((w) => (
                <li key={w.id} className="flex items-center gap-3 text-sm">
                  <span className="flex-1 text-gray-700 dark:text-gray-300">{w.name}</span>
                  <input
                    type="number"
                    step={0.01}
                    className="w-32 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm"
                    value={draft.openingWalletBalances[String(w.id)] ?? 0}
                    onChange={(e) => setOpeningWalletBalance(w.id, Number(e.target.value))}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
        {draft.needsRefresh && (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Indeks wymaga odświeżenia.
            {draft.lastRefreshedAt ? ` Ostatnio: ${new Date(draft.lastRefreshedAt).toLocaleString('pl-PL')}.` : ''}
          </p>
        )}
      </fieldset>

      <fieldset className="space-y-3 hidden">
        <legend className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Saldo przeniesione (legacy)
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-sm text-gray-600 dark:text-gray-400">
            Maciek (PLN)
            <input
              type="number"
              min={0}
              step={0.01}
              className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              value={draft.carryOverMaciek}
              onChange={(e) => setDraft((p) => ({
                ...p,
                carryOverMaciek: Number(e.target.value),
              }))}
            />
          </label>
          <label className="text-sm text-gray-600 dark:text-gray-400">
            Basia (PLN)
            <input
              type="number"
              min={0}
              step={0.01}
              className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              value={draft.carryOverBasia}
              onChange={(e) => setDraft((p) => ({
                ...p,
                carryOverBasia: Number(e.target.value),
              }))}
            />
          </label>
        </div>
      </fieldset>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#c9a96e] text-white text-sm font-medium hover:bg-[#b8985f] disabled:opacity-50 transition-colors"
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        Zapisz konfigurację
      </button>
    </div>
  )
}

function PartyChecklist({
  parties,
  selected,
  onToggle,
}: {
  parties: Party[]
  selected: number[]
  onToggle: (id: number) => void
}) {
  if (parties.length === 0) {
    return <p className="text-sm text-gray-400">Brak podmiotów.</p>
  }

  return (
    <ul className="space-y-1.5 max-h-48 overflow-y-auto border border-gray-100 dark:border-gray-800 rounded-lg p-3">
      {parties.map((p) => (
        <li key={p.id}>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(p.id)}
              onChange={() => onToggle(p.id)}
              className="rounded border-gray-300"
            />
            <span className="text-gray-700 dark:text-gray-300">{p.name}</span>
          </label>
        </li>
      ))}
    </ul>
  )
}
