import { useEffect, useState } from 'react'
import { ChevronRight, UserPlus } from 'lucide-react'
import { AuthUser } from '@/shared/types/auth'
import { fetchUsers, deactivateUser } from '@/shared/api/users'
import AvatarDisplay from '@/shared/components/AvatarDisplay'
import UserForm from '../components/UserForm'

type View = 'list' | 'create' | 'edit'

export default function Users() {
  const [users, setUsers] = useState<AuthUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState<View>('list')
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null)
  const [deactivating, setDeactivating] = useState<number | null>(null)

  const load = () => {
    setIsLoading(true)
    fetchUsers().then(setUsers).finally(() => setIsLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const goToList = () => {
    setView('list')
    setEditingUser(null)
  }
  const goToCreate = () => {
    setEditingUser(null)
    setView('create')
  }
  const goToEdit = (user: AuthUser) => {
    setEditingUser(user)
    setView('edit')
  }

  const handleSaved = (saved: AuthUser) => {
    setUsers((prev) => {
      const idx = prev.findIndex((u) => u.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [...prev, saved]
    })
    goToList()
  }

  const handleDeactivate = async (user: AuthUser) => {
    if (!window.confirm(`Dezaktywować użytkownika „${user.displayName}"?`)) return
    setDeactivating(user.id)
    try {
      await deactivateUser(user.id)
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, active: false } : u)))
    } finally {
      setDeactivating(null)
    }
  }

  return (
    <div>
      <nav className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mb-5">
        <button
          onClick={goToList}
          className={[
            'hover:text-gray-700 dark:hover:text-gray-200 transition-colors',
            view === 'list' ? 'text-gray-600 dark:text-gray-300 font-medium' : '',
          ].join(' ')}
        >
          Użytkownicy
        </button>
        {view !== 'list' && (
          <>
            <ChevronRight size={12} />
            <span className="text-gray-700 dark:text-gray-200 font-medium">
              {view === 'create' ? 'Nowy użytkownik' : 'Edycja użytkownika'}
            </span>
          </>
        )}
      </nav>

      {view === 'list' && (
        <>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Użytkownicy</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Zarządzanie kontami użytkowników SamFin</p>
            </div>
            <button
              onClick={goToCreate}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#1c4230' }}
            >
              <UserPlus size={15} />
              Dodaj użytkownika
            </button>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            {isLoading ? (
              <div className="py-16 text-center text-sm text-gray-400">Ładowanie…</div>
            ) : users.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-400">Brak użytkowników</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
                      {['Użytkownik', 'Email', 'Rola', 'Status', 'Akcje'].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <AvatarDisplay
                              sprite={user.avatarSprite}
                              index={user.avatarIndex}
                              displayName={user.displayName}
                              size={36}
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.displayName}</p>
                              {(user.forename || user.surname) && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {[user.forename, user.surname].filter(Boolean).join(' ')}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{user.email}</td>
                        <td className="px-4 py-3">
                          <RoleBadge role={user.role} />
                        </td>
                        <td className="px-4 py-3">
                          <ActiveBadge active={user.active} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => goToEdit(user)}
                              className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                              Edytuj
                            </button>
                            {user.active && (
                              <button
                                onClick={() => handleDeactivate(user)}
                                disabled={deactivating === user.id}
                                className="px-3 py-1.5 text-xs font-medium rounded-md border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-50 transition-colors"
                              >
                                {deactivating === user.id ? '…' : 'Dezaktywuj'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {(view === 'create' || view === 'edit') && (
        <>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-5">
            {view === 'create' ? 'Nowy użytkownik' : `Edycja: ${editingUser?.displayName}`}
          </h2>
          <UserForm mode="admin-edit" user={view === 'edit' ? editingUser : null} onSaved={handleSaved} onCancel={goToList} />
        </>
      )}
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
        role === 'ADMIN'
          ? 'bg-[#163526]/10 text-[#163526] dark:bg-[#c9a96e]/15 dark:text-[#c9a96e]'
          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
      ].join(' ')}
    >
      {role === 'ADMIN' ? 'Administrator' : 'Użytkownik'}
    </span>
  )
}

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
        active
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
          : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400',
      ].join(' ')}
    >
      {active ? 'Aktywny' : 'Nieaktywny'}
    </span>
  )
}
