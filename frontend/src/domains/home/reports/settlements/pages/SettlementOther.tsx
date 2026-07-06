import { useSettlementReport } from '@/domains/home/reports/settlements/context/SettlementReportContext'
import { WalletGroupSection } from '@/domains/home/reports/settlements/components/WalletGroupSection'
import { WALLET_GROUP_LABELS } from '@/domains/home/reports/settlements/constants'

export default function SettlementOther() {
  const { filteredWalletGroups, openTx } = useSettlementReport()

  if (!filteredWalletGroups) return null

  return (
    <WalletGroupSection
      personKey="other"
      title={WALLET_GROUP_LABELS.other}
      group={filteredWalletGroups.other}
      informational
      onOpenTransaction={openTx}
    />
  )
}
