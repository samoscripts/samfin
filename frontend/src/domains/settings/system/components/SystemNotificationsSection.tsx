import { useState } from 'react'
import SystemSection from './SystemSection'
import SystemOptionRow from './SystemOptionRow'
import ToggleSwitch from '@/shared/components/form/ToggleSwitch'

export default function SystemNotificationsSection() {
  const [importEmails, setImportEmails] = useState(false)
  const [unclassifiedAlerts, setUnclassifiedAlerts] = useState(true)
  const [weeklySummary, setWeeklySummary] = useState(false)

  return (
    <SystemSection title="Powiadomienia" defaultOpen={false}>
      <SystemOptionRow
        title="E-mail po zakończeniu importu CSV"
        description="Wyślij powiadomienie, gdy import transakcji zostanie pomyślnie przetworzony."
        action={
          <ToggleSwitch
            checked={importEmails}
            onChange={setImportEmails}
            label="E-mail po zakończeniu importu CSV"
          />
        }
      />
      <SystemOptionRow
        title="Przypomnienia o nieklasyfikowanych transakcjach"
        description="Codzienne podsumowanie liczby transakcji oczekujących na klasyfikację."
        action={
          <ToggleSwitch
            checked={unclassifiedAlerts}
            onChange={setUnclassifiedAlerts}
            label="Przypomnienia o nieklasyfikowanych transakcjach"
          />
        }
      />
      <SystemOptionRow
        title="Cotygodniowe podsumowanie"
        description="Krótki raport przychodów i wydatków wysyłany w każdy poniedziałek rano."
        action={
          <ToggleSwitch
            checked={weeklySummary}
            onChange={setWeeklySummary}
            label="Cotygodniowe podsumowanie"
          />
        }
      />
    </SystemSection>
  )
}
