import BackupsListSection from '../components/BackupsListSection'
import BackupRestoreSection from '../components/BackupRestoreSection'

export default function BackupsSettings() {
  return (
    <div className="w-full space-y-3">
      <BackupsListSection />
      <BackupRestoreSection />
    </div>
  )
}
