import { FormEvent, useEffect, useState } from 'react'
import { AuthUser, UserRole } from '@/shared/types/auth'
import { updateMe } from '@/shared/api/auth'
import { UserPayload, createUser, updateUser } from '@/shared/api/users'
import AvatarPicker from '@/shared/components/AvatarPicker'
import AvatarDisplay from '@/shared/components/AvatarDisplay'
import FormActions from '@/shared/components/form/FormActions'
import FormError from '@/shared/components/form/FormError'
import FormField from '@/shared/components/form/FormField'
import Select from '@/shared/components/form/Select'
import { configInputCls, configSelectCls } from '@/shared/components/form/formClasses'
import { getApiErrorMessage } from '@/shared/utils/errors'

type UserFormMode = 'admin-edit' | 'self-edit'

interface UserFormProps {
  mode: UserFormMode
  user?: AuthUser | null
  onSaved: (user: AuthUser) => void
  onCancel: () => void
  hideCancel?: boolean
}

const EMPTY: UserPayload = {
  email: '',
  forename: '',
  surname: '',
  displayName: '',
  role: 'USER',
  active: true,
  avatarSprite: null,
  avatarIndex: null,
  password: '',
}

const readOnlyInputCls =
  configInputCls +
  ' bg-gray-100 dark:bg-gray-800/70 text-gray-500 dark:text-gray-400 cursor-not-allowed'

export default function UserForm({ mode, user, onSaved, onCancel, hideCancel = false }: UserFormProps) {
  const isSelfEdit = mode === 'self-edit'
  const isEdit = !!user
  const [form, setForm] = useState<UserPayload>({ ...EMPTY })
  const [newPassword, setNewPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setForm({
        email: user.email,
        forename: user.forename,
        surname: user.surname,
        displayName: user.displayName,
        role: user.role,
        active: user.active,
        avatarSprite: user.avatarSprite,
        avatarIndex: user.avatarIndex,
      })
    } else {
      setForm({ ...EMPTY })
    }
    setNewPassword('')
    setCurrentPassword('')
    setError(null)
  }, [user])

  const set = <K extends keyof UserPayload>(key: K, val: UserPayload[K]) =>
    setForm((f) => ({ ...f, [key]: val }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSaving(true)
    try {
      let saved: AuthUser
      if (isSelfEdit) {
        const payload: {
          forename: string
          surname: string
          displayName: string
          avatarSprite: string | null
          avatarIndex: number | null
          currentPassword?: string
          newPassword?: string
        } = {
          forename: form.forename,
          surname: form.surname,
          displayName: form.displayName,
          avatarSprite: form.avatarSprite,
          avatarIndex: form.avatarIndex,
        }
        if (newPassword) {
          payload.currentPassword = currentPassword
          payload.newPassword = newPassword
        }
        saved = await updateMe(payload)
      } else {
        const payload: UserPayload = { ...form }
        if (isEdit && newPassword) payload.newPassword = newPassword
        if (!isEdit) payload.password = form.password
        saved = isEdit ? await updateUser(user!.id, payload) : await createUser(payload)
      }
      onSaved(saved)
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Wystąpił błąd przy zapisie.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-5">
          <Card title="Dane użytkownika">
            <div className="flex items-center gap-4 mb-5 pb-5 border-b border-gray-100 dark:border-gray-800">
              <AvatarDisplay
                sprite={form.avatarSprite}
                index={form.avatarIndex}
                displayName={form.displayName || form.email}
                size={52}
              />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {form.displayName || <span className="text-gray-400">Podgląd</span>}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{form.email || 'brak emaila'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <FormField label="Email" required>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  readOnly={isSelfEdit}
                  required
                  className={isSelfEdit ? readOnlyInputCls : configInputCls}
                  placeholder="np. maciej@example.com"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Imię">
                  <input
                    type="text"
                    value={form.forename}
                    onChange={(e) => set('forename', e.target.value)}
                    className={configInputCls}
                    placeholder="Imię"
                  />
                </FormField>
                <FormField label="Nazwisko">
                  <input
                    type="text"
                    value={form.surname}
                    onChange={(e) => set('surname', e.target.value)}
                    className={configInputCls}
                    placeholder="Nazwisko"
                  />
                </FormField>
              </div>

              <FormField label="Nazwa wyświetlana" required>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => set('displayName', e.target.value)}
                  required
                  className={configInputCls}
                  placeholder="np. Maciej"
                />
              </FormField>

              {!isSelfEdit && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Rola">
                    <Select
                      className={configSelectCls}
                      value={form.role}
                      onChange={(e) => set('role', e.target.value as UserRole)}
                    >
                      <option value="USER">Użytkownik</option>
                      <option value="ADMIN">Administrator</option>
                    </Select>
                  </FormField>
                  <FormField label="Status">
                    <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.active}
                        onChange={(e) => set('active', e.target.checked)}
                        className="rounded border-gray-300 dark:border-gray-600 accent-[#1c4230]"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Aktywny</span>
                    </label>
                  </FormField>
                </div>
              )}
            </div>
          </Card>

          <Card title={isSelfEdit ? 'Zmiana hasła' : isEdit ? 'Zmiana hasła (opcjonalna)' : 'Hasło'}>
            {!isEdit && !isSelfEdit ? (
              <FormField label="Hasło" required>
                <input
                  type="password"
                  value={form.password ?? ''}
                  onChange={(e) => set('password', e.target.value)}
                  required
                  className={configInputCls}
                  placeholder="Minimum 6 znaków"
                />
              </FormField>
            ) : (
              <div className="space-y-3">
                {isSelfEdit && (
                  <FormField label="Aktualne hasło">
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className={configInputCls}
                      placeholder="Wymagane przy zmianie hasła"
                    />
                  </FormField>
                )}
                <FormField label="Nowe hasło">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={configInputCls}
                    placeholder={isSelfEdit ? 'Pozostaw puste, aby nie zmieniać' : 'Pozostaw puste, aby nie zmieniać'}
                  />
                </FormField>
              </div>
            )}
          </Card>

          {error && <FormError message={error} />}

          <FormActions
            saving={isSaving}
            submitLabel={isEdit ? 'Zapisz zmiany' : 'Dodaj użytkownika'}
            onCancel={onCancel}
            hideCancel={hideCancel}
          />
        </div>

        <div className="lg:col-span-2">
          <Card title="Awatar">
            <AvatarPicker
              value={{ avatarSprite: form.avatarSprite, avatarIndex: form.avatarIndex }}
              onChange={({ avatarSprite, avatarIndex }) => {
                set('avatarSprite', avatarSprite)
                set('avatarIndex', avatarIndex)
              }}
            />
          </Card>
        </div>
      </div>
    </form>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
        {title}
      </h3>
      {children}
    </div>
  )
}
