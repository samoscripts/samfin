import { useSettlementReport } from '@/domains/home/reports/settlements/context/SettlementReportContext'
import { PairedWalletGroups } from '@/domains/home/reports/settlements/components/WalletGroupSection'

export default function SettlementWallets() {
  const { filteredWalletGroups, openTx } = useSettlementReport()

  if (!filteredWalletGroups) return null

  return (
    <PairedWalletGroups
      maciek={filteredWalletGroups.maciek}
      basia={filteredWalletGroups.basia}
      onOpenTransaction={openTx}
    />
  )
}
