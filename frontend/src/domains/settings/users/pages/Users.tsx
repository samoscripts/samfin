import { useEffect, useState } from 'react'
import { ChevronRight, UserPlus } from 'lucide-react'
import { AuthUser } from '@/shared/types/auth'
import { fetchUsers, fetchUser, deactivateUser } from '@/shared/api/users'
import { useCrudRoute } from '@/shared/hooks/useCrudRoute'
import AvatarDisplay from '@/shared/components/AvatarDisplay'
import Pill from '@/shared/components/Pill'
import { USER_ROLE_PILL } from '@/shared/constants/pillMaps'
import { Loader2 } from 'lucide-react'
import UserForm from '../components/UserForm'

const ROUTE_BASE = '/ustawienia/uzytkownicy'

export default function Users() {
  const { isList, isCreate, isEdit, entityId, goList, goCreate, goEdit } = useCrudRoute(ROUTE_BASE)

  const [users, setUsers] = useState<AuthUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [deactivating, setDeactivating] = useState<number | null>(null)

  useEffect(() => {
    if (!isList) return
    setIsLoading(true)
    fetchUsers().then(setUsers).finally(() => setIsLoading(false))
  }, [isList])

  useEffect(() => {
    if (!isEdit || entityId === null) {
      setEditingUser(null)
      return
    }

    const fromList = users.find((u) => u.id === entityId)
    if (fromList) {
      setEditingUser(fromList)
      return
    }

    let cancelled = false
    setEditLoading(true)
    fetchUser(entityId)
      .then((user) => {
        if (!cancelled) setEditingUser(user)
      })
      .catch(() => {
        if (!cancelled) setEditingUser(null)
      })
      .finally(() => {
        if (!cancelled) setEditLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isEdit, entityId, users])

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
    goList()
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

  const breadcrumb = (
    <nav className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mb-5">
      <button
        type="button"
        onClick={goList}
        className={[
          'hover:text-gray-700 dark:hover:text-gray-200 transition-colors',
          isList ? 'text-gray-600 dark:text-gray-300 font-medium' : '',
        ].join(' ')}
      >
        Użytkownicy
      </button>
      {!isList && (
        <>
          <ChevronRight size={12} />
          <span className="text-gray-700 dark:text-gray-200 font-medium">
            {isCreate ? 'Nowy użytkownik' : 'Edycja użytkownika'}
          </span>
        </>
      )}
    </nav>
  )

  if (isCreate || isEdit) {
    if (isEdit && editLoading) {
      return (
        <div>
          {breadcrumb}
          <div className="py-12 flex justify-center text-gray-400">
            <Loader2 size={24} className="animate-spin" />
          </div>
        </div>
      )
    }

    if (isEdit && !editingUser) {
      return (
        <div>
          {breadcrumb}
          <p className="text-sm text-red-600 dark:text-red-400">Nie znaleziono użytkownika.</p>
        </div>
      )
    }

    return (
      <div>
        {breadcrumb}
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-5">
          {isCreate ? 'Nowy użytkownik' : `Edycja: ${editingUser?.displayName}`}
        </h2>
        <UserForm
          mode="admin-edit"
          user={isEdit ? editingUser : null}
          onSaved={handleSaved}
          onCancel={goList}
        />
      </div>
    )
  }

  return (
    <div>
      {breadcrumb}

      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Użytkownicy</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Zarządzanie kontami użytkowników SamFin</p>
        </div>
        <button
          onClick={goCreate}
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
                      <Pill variant={USER_ROLE_PILL[user.role] ?? 'neutral'}>
                        {user.role === 'ADMIN' ? 'Administrator' : 'Użytkownik'}
                      </Pill>
                    </td>
                    <td className="px-4 py-3">
                      <Pill variant={user.active ? 'success' : 'danger'}>
                        {user.active ? 'Aktywny' : 'Nieaktywny'}
                      </Pill>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => goEdit(user.id)}
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
    </div>
  )
}
