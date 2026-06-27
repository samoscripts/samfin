import { useAuth } from './providers/AuthProvider'
import { AppLockProvider, useAppLock } from './providers/AppLockProvider'
import AppRoutes from './routes'
import Login from './pages/Login'
import IncomingCsvHandler from '@/mobile/IncomingCsvHandler'
import AppLockScreen from '@/mobile/AppLockScreen'
import { isNativeApp } from '@/mobile/platform'

function AppContent() {
  const { user, isLoading } = useAuth()
  const { phase, isInitializing, pinChecked } = useAppLock()

  const waitingForLock =
    isNativeApp() &&
    (isInitializing || (user != null && !pinChecked && phase !== 'locked'))

  if (isLoading || waitingForLock) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-8 h-8 border-2 border-[#c9a96e]/40 border-t-[#c9a96e] rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    if (isNativeApp() && phase === 'locked') {
      return <AppLockScreen mode="unlock" />
    }
    return <Login />
  }

  if (isNativeApp() && phase === 'setup') {
    return <AppLockScreen mode="setup" />
  }

  if (isNativeApp() && phase === 'locked') {
    return <AppLockScreen mode="unlock" />
  }

  return (
    <>
      <IncomingCsvHandler />
      <AppRoutes />
    </>
  )
}

export default function App() {
  const { user, restoreSession } = useAuth()

  return (
    <AppLockProvider isAuthenticated={user != null} onUnlock={restoreSession}>
      <AppContent />
    </AppLockProvider>
  )
}
