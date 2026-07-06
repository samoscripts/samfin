import { useSettlementReport } from '@/domains/home/reports/settlements/context/SettlementReportContext'
import StandardDepositsSection from '@/domains/home/reports/settlements/components/StandardDepositsSection'

export default function SettlementRotatingDeposits() {
  const { data, filteredStandardDeposits, openTx } = useSettlementReport()

  if (!data || !filteredStandardDeposits) return null

  const { personOutlook } = data

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
      <StandardDepositsSection
        person="maciek"
        title="Wpłaty rotacyjne — Maciek"
        total={filteredStandardDeposits.maciek.total}
        items={filteredStandardDeposits.maciek.items}
        isAnchor={personOutlook.maciek.isAnchor}
        className="h-full"
        onOpenTransaction={openTx}
      />
      <StandardDepositsSection
        person="basia"
        title="Wpłaty rotacyjne — Basia"
        total={filteredStandardDeposits.basia.total}
        items={filteredStandardDeposits.basia.items}
        isAnchor={personOutlook.basia.isAnchor}
        className="h-full"
        onOpenTransaction={openTx}
      />
    </div>
  )
}
