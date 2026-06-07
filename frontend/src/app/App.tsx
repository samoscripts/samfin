import { useAuth } from './providers/AuthProvider'
import AppRoutes from './routes'
import Login from './pages/Login'

export default function App() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-8 h-8 border-2 border-[#c9a96e]/40 border-t-[#c9a96e] rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  return <AppRoutes />
}
