import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronRight, Loader2, Plus } from 'lucide-react'
import { fetchParties, fetchPartiesForClassificationRules } from '@/shared/api/parties'
import { fetchWallets } from '@/shared/api/wallets'
import { fetchCategories } from '@/shared/api/categories'
import { fetchConcerns } from '@/shared/api/concerns'
import {
  deleteClassificationRule,
  fetchAllClassificationRules,
  type ClassificationRule,
} from '@/shared/api/classificationRules'
import type { Category } from '@/shared/api/categories'
import type { Party } from '@/domains/home/configuration/parties/types'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import type { Transaction } from '@/shared/types'
import { fetchTransaction } from '@/shared/api/transactions'
import { useCrudRoute } from '@/shared/hooks/useCrudRoute'
import TransactionSummaryCard from '@/domains/home/transactions/components/TransactionSummaryCard'
import ClassificationRuleForm from '../components/ClassificationRuleForm'
import ClassificationRulesTable from '../components/ClassificationRulesTable'
import {
  buildRuleDraftFromTransaction,
  type RuleFromTransactionDraft,
} from '../utils/ruleFromTransaction'

const ROUTE_BASE = '/konfiguracja/reguly'

export default function ClassificationRules() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { isList, isCreate, isEdit, entityId, goList, goCreate, goEdit } = useCrudRoute(ROUTE_BASE)

  const [parties, setParties] = useState<Party[]>([])
  const [ruleContextParties, setRuleContextParties] = useState<Party[]>([])
  const [rules, setRules] = useState<ClassificationRule[]>([])
  const [loading, setLoading] = useState(false)
  const [editingRule, setEditingRule] = useState<ClassificationRule | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ClassificationRule | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [wallets, setWallets] = useState<{ id: number; name: string }[]>([])
  const [concerns, setConcerns] = useState<{ id: number; name: string }[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [createFromTx, setCreateFromTx] = useState<Transaction | null>(null)
  const [ruleDraft, setRuleDraft] = useState<RuleFromTransactionDraft | null>(null)

  const loadRules = useCallback(async () => {
    setLoading(true)
    try {
      setRules(await fetchAllClassificationRules())
    } catch {
      setRules([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchParties().then(setParties).catch(() => setParties([]))
    fetchPartiesForClassificationRules()
      .then(setRuleContextParties)
      .catch(() => setRuleContextParties([]))
    fetchWallets().then(setWallets).catch(() => [])
    fetchConcerns().then(setConcerns).catch(() => [])
    fetchCategories().then(setCategories).catch(() => [])
  }, [])

  useEffect(() => {
    if (isList) loadRules()
  }, [isList, loadRules])

  useEffect(() => {
    if (!isEdit || entityId === null) {
      setEditingRule(null)
      return
    }
    const rule = rules.find((r) => r.id === entityId) ?? null
    setEditingRule(rule)
  }, [isEdit, entityId, rules])

  useEffect(() => {
    if (!isCreate) {
      setCreateFromTx(null)
      setRuleDraft(null)
      return
    }

    const fromTxRaw = searchParams.get('fromTx')
    if (!fromTxRaw) return

    const fromTxId = Number.parseInt(fromTxRaw, 10)
    if (!Number.isFinite(fromTxId)) {
      setSearchParams({}, { replace: true })
      return
    }

    let cancelled = false
    fetchTransaction(fromTxId)
      .then((tx) => {
        if (cancelled) return
        const draft = buildRuleDraftFromTransaction(tx)
        if (draft) {
          setCreateFromTx(tx)
          setRuleDraft(draft)
        }
        setSearchParams({}, { replace: true })
      })
      .catch(() => {
        if (!cancelled) setSearchParams({}, { replace: true })
      })

    return () => {
      cancelled = true
    }
  }, [isCreate, searchParams, setSearchParams])

  async function handlePartyCreated() {
    setParties(await fetchParties())
  }

  async function handleCategoryCreated() {
    setCategories(await fetchCategories())
  }

  async function handleFormSaved() {
    goList()
    await loadRules()
  }

  async function handleDelete() {
    if (!deleteTarget?.partyId) return
    setDeleting(true)
    try {
      await deleteClassificationRule(deleteTarget.partyId, deleteTarget.id)
      setDeleteTarget(null)
      await loadRules()
    } finally {
      setDeleting(false)
    }
  }

  const breadcrumb = (
    <nav className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 mb-6">
      <button
        type="button"
        onClick={goList}
        className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      >
        Reguły
      </button>
      {!isList && (
        <>
          <ChevronRight size={12} className="shrink-0" />
          <span className="text-gray-600 dark:text-gray-400 font-medium">
            {isCreate
              ? createFromTx
                ? 'Nowa reguła z transakcji'
                : 'Nowa reguła'
              : `Edycja: ${editingRule?.name ?? ''}`}
          </span>
        </>
      )}
    </nav>
  )

  if (isCreate || isEdit) {
    if (isEdit && !editingRule) {
      return (
        <div>
          {breadcrumb}
          <p className="text-sm text-red-600 dark:text-red-400">Nie znaleziono reguły.</p>
        </div>
      )
    }

    return (
      <div>
        {breadcrumb}
        <div className="w-full space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {isCreate
              ? createFromTx
                ? 'Nowa reguła z transakcji'
                : 'Nowa reguła'
              : `Edycja: ${editingRule?.name ?? ''}`}
          </h2>

          {createFromTx && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Transakcja źródłowa
              </h3>
              <TransactionSummaryCard tx={createFromTx} layout="grid" />
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <ClassificationRuleForm
              key={
                createFromTx
                  ? `from-tx-${createFromTx.transactionId}`
                  : (editingRule?.id ?? 'new')
              }
              rule={isEdit ? editingRule : null}
              initialDraft={isCreate ? ruleDraft : null}
              allRules={rules}
              ruleContextParties={ruleContextParties}
              parties={parties}
              wallets={wallets}
              concerns={concerns}
              categories={categories}
              onSaved={handleFormSaved}
              onCancel={goList}
              onPartyCreated={handlePartyCreated}
              onCategoryCreated={handleCategoryCreated}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {breadcrumb}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Reguły stosowane są do transakcji, w których wybrany podmiot jest stroną własną (Skąd przy wydatku,
          Dokąd przy wpływie). Kolejność wg priorytetu — niższa liczba = wcześniej.
        </p>
        <button
          type="button"
          disabled={ruleContextParties.length === 0}
          onClick={goCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 shrink-0"
          style={{ backgroundColor: '#1c4230' }}
        >
          <Plus size={16} />
          Nowa reguła
        </button>
      </div>

      {ruleContextParties.length === 0 && (
        <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-lg mb-4">
          Brak podmiotów spełniających kryteria (OWN + konto bankowe + import). Dodaj konto i zaimportuj wyciąg.
        </p>
      )}

      {loading ? (
        <div className="py-12 flex justify-center text-gray-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : rules.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">Brak reguł.</p>
      ) : (
        <ClassificationRulesTable
          rules={rules}
          onEdit={(rule) => goEdit(rule.id)}
          onDelete={setDeleteTarget}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Usuń regułę"
        message={`Usunąć regułę „${deleteTarget?.name}"?`}
        confirmLabel="Usuń"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
