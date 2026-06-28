import { FormEvent, useEffect, useState } from 'react'
import { Fingerprint, Lock } from 'lucide-react'
import {
  isBiometricUnlockEnabled,
  isValidPin,
  setBiometricUnlockEnabled,
  setPin,
  verifyPin,
} from '@/mobile/pinAuth'
import {
  isBiometricAvailable,
  promptBiometricUnlock,
} from '@/mobile/biometric'
import { useAppLock } from '@/app/providers/AppLockProvider'
import { useAuth } from '@/app/providers/AuthProvider'

type Mode = 'setup' | 'unlock'

interface AppLockScreenProps {
  mode: Mode
}

export default function AppLockScreen({ mode }: AppLockScreenProps) {
  const { completeSetup, unlock } = useAppLock()
  const { logout } = useAuth()

  const [pin, setPinValue] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [step, setStep] = useState<'enter' | 'confirm'>('enter')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [enableBiometric, setEnableBiometric] = useState(true)

  useEffect(() => {
    void isBiometricAvailable().then(setBiometricAvailable)
  }, [])

  useEffect(() => {
    if (mode !== 'unlock' || !biometricAvailable) {
      return
    }

    void (async () => {
      if (!(await isBiometricUnlockEnabled())) {
        return
      }
      setBusy(true)
      const ok = await promptBiometricUnlock()
      if (ok) {
        const restored = await unlock()
        if (!restored) {
          setError('Sesja wygasła. Zaloguj się ponownie.')
          await logout()
        }
      }
      setBusy(false)
    })()
  }, [mode, biometricAvailable, unlock])

  async function handleSetupSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (step === 'enter') {
      if (!isValidPin(pin)) {
        setError('PIN musi mieć 4–8 cyfr.')
        return
      }
      setStep('confirm')
      return
    }

    if (pin !== confirmPin) {
      setError('PIN-y nie są zgodne.')
      setConfirmPin('')
      return
    }

    setBusy(true)
    try {
      await setPin(pin)
      if (biometricAvailable && enableBiometric) {
        await setBiometricUnlockEnabled(true)
      }
      setPinValue('')
      setConfirmPin('')
      completeSetup()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Nie udało się zapisać PIN.')
    } finally {
      setBusy(false)
    }
  }

  async function handleUnlockSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!isValidPin(pin)) {
      setError('Nieprawidłowy PIN.')
      return
    }

    setBusy(true)
    try {
      const valid = await verifyPin(pin)
      if (!valid) {
        setError('Nieprawidłowy PIN.')
        setPinValue('')
        return
      }

      const restored = await unlock()
      if (!restored) {
        setError('Sesja wygasła. Zaloguj się ponownie.')
        await logout()
        return
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleBiometric() {
    setError('')
    setBusy(true)
    try {
      const ok = await promptBiometricUnlock()
      if (!ok) {
        return
      }
      const restored = await unlock()
      if (!restored) {
        setError('Sesja wygasła. Zaloguj się ponownie.')
        await logout()
        return
      }
    } finally {
      setBusy(false)
    }
  }

  const isSetup = mode === 'setup'
  const title = isSetup
    ? step === 'enter'
      ? 'Ustaw PIN aplikacji'
      : 'Potwierdź PIN'
    : 'Odblokuj SamFin'

  const subtitle = isSetup
    ? 'PIN zabezpiecza dostęp do SamFin na tym telefonie.'
    : 'Wprowadź PIN lub użyj odcisku palca.'

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#1a472a] flex items-center justify-center">
            <Lock className="text-[#c9a96e]" size={28} />
          </div>
        </div>

        <h1 className="text-xl font-semibold text-white text-center mb-1">{title}</h1>
        <p className="text-sm text-gray-400 text-center mb-8">{subtitle}</p>

        <form onSubmit={isSetup ? handleSetupSubmit : handleUnlockSubmit} className="space-y-4">
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={isSetup ? 'new-password' : 'current-password'}
            maxLength={8}
            value={isSetup && step === 'confirm' ? confirmPin : pin}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '')
              if (isSetup && step === 'confirm') {
                setConfirmPin(v)
              } else {
                setPinValue(v)
              }
            }}
            placeholder={isSetup && step === 'confirm' ? 'Powtórz PIN' : '••••'}
            className="w-full text-center text-2xl tracking-[0.4em] px-4 py-3 rounded-xl border border-gray-700 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40"
            autoFocus
            disabled={busy}
          />

          {isSetup && biometricAvailable && step === 'confirm' && (
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={enableBiometric}
                onChange={(e) => setEnableBiometric(e.target.checked)}
                className="rounded border-gray-600"
              />
              Odblokowuj odciskiem palca
            </label>
          )}

          {error && <p className="text-sm text-red-400 text-center">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-xl bg-[#1a472a] hover:bg-[#163526] text-white font-medium disabled:opacity-50 transition-colors"
          >
            {busy ? '…' : isSetup ? (step === 'enter' ? 'Dalej' : 'Zapisz PIN') : 'Odblokuj'}
          </button>
        </form>

        {!isSetup && biometricAvailable && (
          <button
            type="button"
            onClick={() => void handleBiometric()}
            disabled={busy}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-700 text-gray-200 hover:bg-gray-900 disabled:opacity-50 transition-colors"
          >
            <Fingerprint size={18} />
            Odcisk palca
          </button>
        )}
      </div>
    </div>
  )
}
