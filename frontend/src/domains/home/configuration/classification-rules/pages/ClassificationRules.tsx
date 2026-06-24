import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronRight, Loader2, PanelRight, Plus, Save } from 'lucide-react'
import { fetchParties, fetchPartiesForClassificationRules } from '@/shared/api/parties'
import { fetchWallets, type Wallet } from '@/shared/api/wallets'
import { fetchCategories, type Category } from '@/shared/api/categories'
import { fetchConcerns, type Concern } from '@/shared/api/concerns'
import {
  deleteClassificationRule,
  fetchAllClassificationRules,
  fetchClassificationRules,
  reorderClassificationRules,
  type ClassificationRule,
} from '@/shared/api/classificationRules'
import type { Party } from '@/domains/home/configuration/parties/types'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import type { Transaction } from '@/shared/types'
import { fetchTransaction } from '@/shared/api/transactions'
import { useCrudRoute } from '@/shared/hooks/useCrudRoute'
import { useRightPanelPortal } from '@/layout/RightPanelContext'
import TransactionSummaryCard from '@/domains/home/transactions/components/TransactionSummaryCard'
import ClassificationRuleForm from '../components/ClassificationRuleForm'
import ClassificationRulesTable from '../components/ClassificationRulesTable'
import ClassificationRulesSidebar from '../components/ClassificationRulesSidebar'
import RuleFilterChips from '../components/RuleFilterChips'
import { parseSafeReturnUrl } from '@/shared/utils/safeReturnUrl'
import {
  buildRuleDraftFromTransaction,
  getRuleContextPartyId,
  type RuleFromTransactionDraft,
} from '../utils/ruleFromTransaction'
import { useClassificationRulesListUrl } from '../hooks/useClassificationRulesListUrl'
import { countActiveRuleFilters, type RuleListFilters } from '../types/ruleFilters'
import { filterRules, sameRuleOrder } from '../utils/ruleFilters'
import {
  computeExpandedPanelWidth,
  loadStoredRulesPanelWidth,
  storeRulesPanelWidth,
} from '../constants/panelLayout'

const ROUTE_BASE = '/konfiguracja/reguly'

export default function ClassificationRules() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const portalRoot = useRightPanelPortal()
  const { isList, isCreate, isEdit, entityId } = useCrudRoute(ROUTE_BASE)

  const {
    partyId: urlPartyId,
    filters: activeFilters,
    panelOpen,
    listQueryString,
    applyUrl,
    openFiltersTab,
    closePanel,
  } = useClassificationRulesListUrl()

  const [panelWidth, setPanelWidth] = useState(loadStoredRulesPanelWidth)
  const [panelExpanded, setPanelExpanded] = useState(false)
  const effectivePanelWidth = panelExpanded ? computeExpandedPanelWidth() : panelWidth

  const [parties, setParties] = useState<Party[]>([])
  const [ruleContextParties, setRuleContextParties] = useState<Party[]>([])
  const [partyRules, setPartyRules] = useState<ClassificationRule[]>([])
  const [orderedRules, setOrderedRules] = useState<ClassificationRule[]>([])
  const [loading, setLoading] = useState(false)
  const [savingOrder, setSavingOrder] = useState(false)
  const [editingRule, setEditingRule] = useState<ClassificationRule | null>(null)
  const [editNotFound, setEditNotFound] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ClassificationRule | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [concerns, setConcerns] = useState<Concern[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [categoriesLoaded, setCategoriesLoaded] = useState(false)
  const [createFromTx, setCreateFromTx] = useState<Transaction | null>(null)
  const [ruleDraft, setRuleDraft] = useState<RuleFromTransactionDraft | null>(null)
  const [returnAfterCreate, setReturnAfterCreate] = useState<string | null>(null)

  const activeFilterCount = countActiveRuleFilters(activeFilters)
  const hasActiveFilters = activeFilterCount > 0
  const orderDirty = !hasActiveFilters && !sameRuleOrder(orderedRules, partyRules)
  const sortable = !hasActiveFilters && partyRules.length > 0

  const displayRules = useMemo(
    () => (hasActiveFilters ? filterRules(orderedRules, activeFilters) : orderedRules),
    [hasActiveFilters, orderedRules, activeFilters],
  )

  const navigateToList = useCallback(() => {
    navigate(`${ROUTE_BASE}${listQueryString}`)
  }, [navigate, listQueryString])

  const navigateToCreate = useCallback(() => {
    navigate(`${ROUTE_BASE}/nowy${listQueryString}`)
  }, [navigate, listQueryString])

  const loadPartyRules = useCallback(async (pid: number | null) => {
    if (pid === null) {
      setPartyRules([])
      setOrderedRules([])
      return
    }
    setLoading(true)
    try {
      const list = await fetchClassificationRules(pid)
      setPartyRules(list)
      setOrderedRules(list)
    } catch {
      setPartyRules([])
      setOrderedRules([])
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
    fetchCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setCategoriesLoaded(true))
  }, [])

  useEffect(() => {
    if (!isList || ruleContextParties.length === 0) return
    if (urlPartyId !== null && ruleContextParties.some((p) => p.id === urlPartyId)) return
    applyUrl({ partyId: ruleContextParties[0].id }, { replace: true })
  }, [isList, ruleContextParties, urlPartyId, applyUrl])

  useEffect(() => {
    if (isList) loadPartyRules(urlPartyId)
  }, [isList, urlPartyId, loadPartyRules])

  useEffect(() => {
    if (!isEdit || entityId === null) {
      setEditingRule(null)
      setEditNotFound(false)
      return
    }
    setEditNotFound(false)
    const rule = partyRules.find((r) => r.id === entityId) ?? null
    if (rule) {
      setEditingRule(rule)
      return
    }

    let cancelled = false
    fetchAllClassificationRules()
      .then((all) => {
        if (cancelled) return
        const found = all.find((r) => r.id === entityId) ?? null
        setEditingRule(found)
        if (!found) setEditNotFound(true)
        if (found?.partyId) {
          void loadPartyRules(found.partyId)
          if (urlPartyId !== found.partyId) {
            applyUrl({ partyId: found.partyId }, { replace: true })
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEditingRule(null)
          setEditNotFound(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [isEdit, entityId, partyRules, loadPartyRules, urlPartyId, applyUrl])

  useEffect(() => {
    if (!isCreate) {
      setCreateFromTx(null)
      setRuleDraft(null)
      setReturnAfterCreate(null)
      return
    }

    const returnUrlRaw = searchParams.get('returnUrl')
    if (returnUrlRaw) {
      setReturnAfterCreate(parseSafeReturnUrl(returnUrlRaw))
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
        if (getRuleContextPartyId(tx) === null) {
          setSearchParams({}, { replace: true })
          return
        }
        setCreateFromTx(tx)
        setSearchParams({}, { replace: true })
      })
      .catch(() => {
        if (!cancelled) setSearchParams({}, { replace: true })
      })

    return () => {
      cancelled = true
    }
  }, [isCreate, searchParams, setSearchParams])

  useEffect(() => {
    if (!createFromTx || !categoriesLoaded) {
      setRuleDraft(null)
      return
    }
    const draft = buildRuleDraftFromTransaction(createFromTx, categories)
    if (draft) setRuleDraft(draft)
  }, [createFromTx, categories, categoriesLoaded])

  const handlePanelWidthChange = useCallback((w: number) => {
    setPanelWidth(w)
    storeRulesPanelWidth(w)
  }, [])

  const handleApplyFilters = useCallback(
    (filters: RuleListFilters, partyId: number | null, options?: { closePanel?: boolean }) => {
      applyUrl({
        filters,
        partyId: partyId ?? urlPartyId,
        ...(options?.closePanel ? { tab: null } : {}),
      })
    },
    [applyUrl, urlPartyId],
  )

  const handleSaveOrder = useCallback(async () => {
    if (urlPartyId === null || !orderDirty) return
    setSavingOrder(true)
    try {
      await reorderClassificationRules(
        urlPartyId,
        orderedRules.map((r) => r.id),
      )
      await loadPartyRules(urlPartyId)
    } finally {
      setSavingOrder(false)
    }
  }, [urlPartyId, orderDirty, orderedRules, loadPartyRules])

  async function handlePartyCreated() {
    setParties(await fetchParties())
  }

  async function handleCategoryCreated() {
    setCategories(await fetchCategories())
  }

  const handleReturnAfterCreate = useCallback(() => {
    if (returnAfterCreate) {
      navigate(returnAfterCreate)
    } else {
      navigateToList()
    }
  }, [returnAfterCreate, navigate, navigateToList])

  async function handleFormSaved() {
    if (isCreate && createFromTx && returnAfterCreate) {
      navigate(returnAfterCreate)
    } else {
      navigateToList()
    }
    if (urlPartyId !== null) await loadPartyRules(urlPartyId)
  }

  async function handleDelete() {
    if (!deleteTarget?.partyId) return
    setDeleting(true)
    try {
      await deleteClassificationRule(deleteTarget.partyId, deleteTarget.id)
      setDeleteTarget(null)
      if (urlPartyId !== null) await loadPartyRules(urlPartyId)
    } finally {
      setDeleting(false)
    }
  }

  const breadcrumb = (
    <nav className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 mb-6">
      <button
        type="button"
        onClick={navigateToList}
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
    if (isEdit && editNotFound) {
      return (
        <div>
          {breadcrumb}
          <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
            Nie znaleziono reguły.
          </p>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={navigateToList}
              className="text-sm text-[#c9a96e] hover:underline"
            >
              Wróć do listy
            </button>
          </div>
        </div>
      )
    }

    if (isEdit && !editingRule) {
      return (
        <div>
          {breadcrumb}
          <div className="py-12 flex justify-center text-gray-400">
            <Loader2 size={24} className="animate-spin" />
          </div>
        </div>
      )
    }

    if (isCreate && createFromTx && !ruleDraft) {
      return (
        <div>
          {breadcrumb}
          <div className="py-12 flex justify-center text-gray-400">
            <Loader2 size={24} className="animate-spin" />
          </div>
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
              allRules={partyRules}
              ruleContextParties={ruleContextParties}
              parties={parties}
              wallets={wallets}
              concerns={concerns}
              categories={categories}
              onSaved={handleFormSaved}
              onCancel={isCreate && createFromTx ? handleReturnAfterCreate : navigateToList}
              onPartyCreated={handlePartyCreated}
              onCategoryCreated={handleCategoryCreated}
            />
          </div>
        </div>
      </div>
    )
  }

  const listActions = (
    <div className="flex flex-wrap items-center gap-2 shrink-0">
      <button
        type="button"
        onClick={openFiltersTab}
        className={[
          'relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors',
          panelOpen
            ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800',
        ].join(' ')}
      >
        <PanelRight size={15} />
        Filtry
        {activeFilterCount > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1"
            style={{ backgroundColor: '#c9a96e' }}
          >
            {activeFilterCount}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={() => void handleSaveOrder()}
        disabled={!orderDirty || savingOrder || urlPartyId === null}
        title={hasActiveFilters ? 'Wyczyść filtry, aby zmienić kolejność' : undefined}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {savingOrder ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
        Zapisz kolejność
      </button>
      <button
        type="button"
        disabled={ruleContextParties.length === 0}
        onClick={navigateToCreate}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: '#1c4230' }}
      >
        <Plus size={16} />
        Nowa reguła
      </button>
    </div>
  )

  return (
    <>
      <div className="flex flex-col min-h-0">
        {breadcrumb}

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Reguły stosowane są do transakcji, w których wybrany podmiot jest stroną własną (Skąd przy
            wydatku, Dokąd przy wpływie). Kolejność wg priorytetu — niższa liczba = wcześniej.
            {hasActiveFilters && (
              <span className="block mt-1 text-amber-700 dark:text-amber-400">
                Wyczyść filtry, aby zmienić kolejność reguł.
              </span>
            )}
          </p>
          {listActions}
        </div>

        {activeFilterCount > 0 && (
          <div className="mb-4">
            <RuleFilterChips
              filters={activeFilters}
              wallets={wallets}
              concerns={concerns}
              categories={categories}
              onChange={(filters) => handleApplyFilters(filters, urlPartyId)}
            />
          </div>
        )}

        {ruleContextParties.length === 0 && (
          <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-lg mb-4">
            Brak podmiotów spełniających kryteria (OWN + konto bankowe + import). Dodaj konto i zaimportuj
            wyciąg.
          </p>
        )}

        {loading ? (
          <div className="py-12 flex justify-center text-gray-400">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : urlPartyId === null ? (
          <p className="text-sm text-gray-400 py-8 text-center">Wybierz podmiot w filtrach.</p>
        ) : displayRules.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">
            {hasActiveFilters ? 'Brak reguł pasujących do filtrów.' : 'Brak reguł.'}
          </p>
        ) : (
          <ClassificationRulesTable
            rules={displayRules}
            sortable={sortable}
            onReorder={setOrderedRules}
            onEdit={(rule) => navigate(`${ROUTE_BASE}/${rule.id}/edycja${listQueryString}`)}
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

      {portalRoot &&
        createPortal(
          <ClassificationRulesSidebar
            open={panelOpen}
            width={effectivePanelWidth}
            expanded={panelExpanded}
            resizable={!panelExpanded}
            onWidthChange={handlePanelWidthChange}
            onToggleExpand={() => setPanelExpanded((v) => !v)}
            partyId={urlPartyId}
            activeFilters={activeFilters}
            onApply={handleApplyFilters}
            ruleContextParties={ruleContextParties}
            wallets={wallets}
            concerns={concerns}
            categories={categories}
            onClose={closePanel}
          />,
          portalRoot,
        )}
    </>
  )
}
