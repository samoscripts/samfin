import { useSettlementReport } from '@/domains/home/reports/settlements/context/SettlementReportContext'
import StandardDepositsSection from '@/domains/home/reports/settlements/components/StandardDepositsSection'

export default function SettlementOwnContributions() {
  const { data, filteredSourceExpenseDeposits, openTx } = useSettlementReport()

  if (!data || !filteredSourceExpenseDeposits) return null

  const { personOutlook } = data

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
      <StandardDepositsSection
        person="maciek"
        title="Wkłady własne — Maciek"
        total={filteredSourceExpenseDeposits.maciek.total}
        items={filteredSourceExpenseDeposits.maciek.items}
        isAnchor={personOutlook.maciek.isAnchor}
        className="h-full"
        onOpenTransaction={openTx}
        emptyMessage="Brak wkładów własnych w wybranym okresie."
      />
      <StandardDepositsSection
        person="basia"
        title="Wkłady własne — Basia"
        total={filteredSourceExpenseDeposits.basia.total}
        items={filteredSourceExpenseDeposits.basia.items}
        isAnchor={personOutlook.basia.isAnchor}
        className="h-full"
        onOpenTransaction={openTx}
        emptyMessage="Brak wkładów własnych w wybranym okresie."
      />
    </div>
  )
}
