import SystemTransactionsSection from '../components/SystemTransactionsSection'
import SystemNotificationsSection from '../components/SystemNotificationsSection'

export default function SystemSettings() {
  return (
    <div className="w-full space-y-3">
      <SystemTransactionsSection />
      <SystemNotificationsSection />
    </div>
  )
}
