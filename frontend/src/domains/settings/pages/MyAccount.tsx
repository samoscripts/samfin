import { ChevronRight } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import UserForm from '@/domains/settings/users/components/UserForm'

export default function MyAccount() {
  const { user, setCurrentUser } = useAuth()

  if (!user) return null

  return (
    <div className="p-4 md:p-6 max-w-screen-xl">
      <div className="mb-6">
        <nav className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mb-1">
          <span className="text-gray-600 dark:text-gray-300 font-medium">Moje konto</span>
          <ChevronRight size={12} />
          <span>Edycja profilu</span>
        </nav>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Moje konto</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Ustawienia Twojego profilu użytkownika</p>
      </div>

      <UserForm
        mode="self-edit"
        user={user}
        onSaved={(saved) => setCurrentUser(saved)}
        onCancel={() => {}}
        hideCancel
      />
    </div>
  )
}
