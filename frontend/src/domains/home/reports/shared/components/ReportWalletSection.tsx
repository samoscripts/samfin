import type { Wallet } from '@/shared/api/wallets'
import DictionarySelect from '@/shared/components/form/DictionarySelect'

interface ReportWalletSectionProps {
  wallets: Wallet[]
  walletId: string
  onChange: (walletId: string) => void
}

export default function ReportWalletSection({
  wallets,
  walletId,
  onChange,
}: ReportWalletSectionProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        Portfel
      </p>
      <DictionarySelect
        items={wallets}
        value={walletId}
        onChange={(v) => onChange(v == null ? '' : String(v))}
        emptyLabel="Wszystkie portfele"
        valueType="string"
      />
    </div>
  )
}
