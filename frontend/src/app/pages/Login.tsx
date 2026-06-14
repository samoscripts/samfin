import { FormEvent, useEffect, useState } from 'react'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import { fetchLoginOptions } from '@/shared/api/auth'
import { LoginOption } from '@/shared/types/auth'
import AvatarDisplay from '@/shared/components/AvatarDisplay'
import AppFooter from '@/layout/AppFooter'

export default function Login() {
  const { login } = useAuth()

  const [options, setOptions] = useState<LoginOption[]>([])
  const [selectedOption, setSelectedOption] = useState<LoginOption | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchLoginOptions()
      .then(setOptions)
      .catch(() => {}) // silently ignore — manual email input is always available
  }, [])

  const selectOption = (opt: LoginOption) => {
    setSelectedOption(opt)
    setEmail(opt.email)
    setError('')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    setError('')
    setIsSubmitting(true)
    try {
      await login(email.trim(), password)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Wystąpił błąd logowania.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src="/app/images/samfin_logo_big.png"
            alt="SamFin"
            className="h-16 w-auto object-contain"
          />
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-8 pt-8 pb-6">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Logowanie
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Zaloguj się do systemu SamFin
            </p>
          </div>

          {/* User tiles */}
          {options.length > 0 && (
            <div className="px-8 pb-6">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Wybierz użytkownika
              </p>
              <div className="grid grid-cols-3 gap-2">
                {options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => selectOption(opt)}
                    title={opt.displayName}
                    aria-label={opt.displayName}
                    className={[
                      'rounded-xl border-2 transition-all text-center px-2 py-2',
                      selectedOption?.id === opt.id
                        ? 'border-[#c9a96e] bg-[#c9a96e]/8'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800',
                    ].join(' ')}
                  >
                    <div className="w-full aspect-square rounded-lg overflow-hidden">
                      <AvatarDisplay
                        sprite={opt.avatarSprite}
                        index={opt.avatarIndex}
                        displayName={opt.displayName}
                        size={84}
                        fill
                        className="w-full h-full rounded-none"
                      />
                    </div>
                    <span className="mt-1 block text-[11px] text-gray-600 dark:text-gray-400 leading-tight truncate">
                      {opt.displayName}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Login form */}
          <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (selectedOption && e.target.value !== selectedOption.email) {
                    setSelectedOption(null)
                  }
                }}
                placeholder="np. admin@samfin.local"
                required
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Hasło
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoFocus={!!selectedOption}
                  className="w-full px-3 py-2.5 pr-10 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: '#1c4230' }}
            >
              <LogIn size={15} />
              {isSubmitting ? 'Logowanie…' : 'Zaloguj się'}
            </button>
          </form>
        </div>
        </div>
      </div>
      <AppFooter variant="minimal" />
    </div>
  )
}
