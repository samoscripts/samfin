import { useAuth } from './providers/AuthProvider'
import { AppLockProvider, useAppLock } from './providers/AppLockProvider'
import { MobileUpdateProvider, useMobileUpdate } from './providers/MobileUpdateProvider'
import AppRoutes from './routes'
import Login from './pages/Login'
import IncomingCsvHandler from '@/mobile/IncomingCsvHandler'
import AppLockScreen from '@/mobile/AppLockScreen'
import MobileUpdateRequiredScreen from '@/mobile/MobileUpdateRequiredScreen'
import { isNativeApp } from '@/mobile/platform'

function AppContent() {
  const { user, isLoading } = useAuth()
  const { phase, isInitializing, pinChecked } = useAppLock()
  const { status: updateStatus, release, localVersionCode, localVersionName, isChecking } =
    useMobileUpdate()

  if (isNativeApp() && updateStatus === 'required' && release) {
    return (
      <MobileUpdateRequiredScreen
        release={release}
        localVersionCode={localVersionCode}
        localVersionName={localVersionName}
      />
    )
  }

  if (isNativeApp() && isChecking && updateStatus === 'checking') {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-8 h-8 border-2 border-[#c9a96e]/40 border-t-[#c9a96e] rounded-full animate-spin" />
      </div>
    )
  }

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
    <MobileUpdateProvider>
      <AppLockProvider isAuthenticated={user != null} onUnlock={restoreSession}>
        <AppContent />
      </AppLockProvider>
    </MobileUpdateProvider>
  )
}
