import { Navigate, useParams, useSearchParams } from 'react-router-dom'

/** Redirect legacy /transactions/:id/edit → list URL with tab=edit (preserves list query). */
export default function TransactionEditRedirect() {
  const { transactionId } = useParams<{ transactionId: string }>()
  const [searchParams] = useSearchParams()

  const tx = Number(transactionId)
  if (!Number.isFinite(tx) || tx <= 0) {
    return <Navigate to="/transactions" replace />
  }

  const params = new URLSearchParams(searchParams)
  params.set('tx', String(tx))
  params.set('tab', 'edit')

  return <Navigate to={`/transactions?${params.toString()}`} replace />
}
