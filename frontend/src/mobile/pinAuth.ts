import { Preferences } from '@capacitor/preferences'
import { isNativeApp } from './platform'

const PIN_HASH_KEY = 'samfin_pin_hash'
const PIN_SALT_KEY = 'samfin_pin_salt'
const BIOMETRIC_KEY = 'samfin_biometric_enabled'

const MIN_PIN_LEN = 4
const MAX_PIN_LEN = 8

export function isValidPin(pin: string): boolean {
  return /^\d+$/.test(pin) && pin.length >= MIN_PIN_LEN && pin.length <= MAX_PIN_LEN
}

export async function hasPin(): Promise<boolean> {
  if (!isNativeApp()) {
    return false
  }

  const { value } = await Preferences.get({ key: PIN_HASH_KEY })
  return value != null && value !== ''
}

async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function setPin(pin: string): Promise<void> {
  if (!isValidPin(pin)) {
    throw new Error('PIN musi mieć 4–8 cyfr.')
  }

  const salt = crypto.randomUUID()
  const hash = await hashPin(pin, salt)

  await Preferences.set({ key: PIN_SALT_KEY, value: salt })
  await Preferences.set({ key: PIN_HASH_KEY, value: hash })
}

export async function verifyPin(pin: string): Promise<boolean> {
  const [{ value: salt }, { value: hash }] = await Promise.all([
    Preferences.get({ key: PIN_SALT_KEY }),
    Preferences.get({ key: PIN_HASH_KEY }),
  ])

  if (!salt || !hash) {
    return false
  }

  const candidate = await hashPin(pin, salt)
  return candidate === hash
}

export async function clearPin(): Promise<void> {
  await Preferences.remove({ key: PIN_HASH_KEY })
  await Preferences.remove({ key: PIN_SALT_KEY })
  await Preferences.remove({ key: BIOMETRIC_KEY })
}

export async function isBiometricUnlockEnabled(): Promise<boolean> {
  const { value } = await Preferences.get({ key: BIOMETRIC_KEY })
  return value === '1'
}

export async function setBiometricUnlockEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    await Preferences.set({ key: BIOMETRIC_KEY, value: '1' })
  } else {
    await Preferences.remove({ key: BIOMETRIC_KEY })
  }
}
