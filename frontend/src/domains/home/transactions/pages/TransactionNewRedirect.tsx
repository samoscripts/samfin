import { Navigate, useSearchParams } from 'react-router-dom'

/** Redirect legacy /transactions/new → list URL with tab=create (preserves prefill query). */
export default function TransactionNewRedirect() {
  const [searchParams] = useSearchParams()

  const params = new URLSearchParams(searchParams)
  params.set('tab', 'create')
  params.delete('tx')

  return <Navigate to={`/transactions?${params.toString()}`} replace />
}
