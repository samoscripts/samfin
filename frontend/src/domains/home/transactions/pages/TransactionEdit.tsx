import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { fetchCategories } from '@/shared/api/categories'
import { fetchConcerns } from '@/shared/api/concerns'
import { fetchParties } from '@/shared/api/parties'
import { fetchTransaction } from '@/shared/api/transactions'
import { fetchWallets } from '@/shared/api/wallets'
import type { Transaction } from '@/shared/types'
import type { Category } from '@/shared/api/categories'
import type { Concern } from '@/shared/api/concerns'
import type { Wallet } from '@/shared/api/wallets'
import type { Party } from '@/domains/home/configuration/parties/types'
import TransactionEditForm, { TransactionEditBreadcrumb } from '../components/TransactionEditForm'

const PAGE_CLS = 'p-4 md:p-6 max-w-screen-xl'

export default function TransactionEdit() {
  const { transactionId } = useParams<{ transactionId: string }>()
  const navigate = useNavigate()
  const id = Number(transactionId)

  const [tx, setTx] = useState<Transaction | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [wallets, setWallets] = useState<Wallet[]>([])
  const [concerns, setConcerns] = useState<Concern[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [parties, setParties] = useState<Party[]>([])

  useEffect(() => {
    fetchWallets().then(setWallets).catch(() => [])
    fetchConcerns().then(setConcerns).catch(() => [])
    fetchCategories().then(setCategories).catch(() => [])
    fetchParties().then(setParties).catch(() => [])
  }, [])

  useEffect(() => {
    if (!Number.isFinite(id)) {
      setError('Nieprawidłowy identyfikator transakcji.')
      setLoading(false)
      return
    }

    setLoading(true)
    fetchTransaction(id)
      .then(setTx)
      .catch(() => setError('Nie udało się załadować transakcji.'))
      .finally(() => setLoading(false))
  }, [id])

  function backToList() {
    navigate('/transactions')
  }

  function handleSaved(updated: Transaction) {
    navigate('/transactions', { state: { selectedTxId: updated.transactionId } })
  }

  if (loading) {
    return (
      <div className={PAGE_CLS}>
        <div className="py-12 flex justify-center text-gray-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      </div>
    )
  }

  if (error || !tx) {
    return (
      <div className={PAGE_CLS}>
        <TransactionEditBreadcrumb tx={null} onBack={backToList} />
        <p className="text-sm text-red-600 dark:text-red-400">{error ?? 'Transakcja nie istnieje.'}</p>
      </div>
    )
  }

  return (
    <div className={PAGE_CLS}>
      <TransactionEditBreadcrumb tx={tx} onBack={backToList} />
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Edycja transakcji</h2>
      <TransactionEditForm
        key={tx.transactionId}
        tx={tx}
        wallets={wallets}
        concerns={concerns}
        categories={categories}
        parties={parties}
        onSaved={handleSaved}
        onCancel={backToList}
      />
    </div>
  )
}
