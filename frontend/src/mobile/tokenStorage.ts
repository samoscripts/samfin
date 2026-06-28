import { Preferences } from '@capacitor/preferences'
import { isNativeApp } from './platform'

const TOKEN_KEY = 'samfin_token'
const LEGACY_LS_KEY = 'samfin_token'

let memoryToken: string | null = null

export function getMemoryToken(): string | null {
  return memoryToken
}

export function setMemoryToken(token: string | null): void {
  memoryToken = token
}

export async function hasStoredToken(): Promise<boolean> {
  if (!isNativeApp()) {
    return localStorage.getItem(LEGACY_LS_KEY) != null
  }

  const { value } = await Preferences.get({ key: TOKEN_KEY })
  return value != null && value !== ''
}

export async function loadTokenToMemory(): Promise<string | null> {
  if (!isNativeApp()) {
    const token = localStorage.getItem(LEGACY_LS_KEY)
    memoryToken = token
    return token
  }

  const { value } = await Preferences.get({ key: TOKEN_KEY })
  memoryToken = value
  return value
}

export async function persistToken(token: string): Promise<void> {
  memoryToken = token

  if (!isNativeApp()) {
    localStorage.setItem(LEGACY_LS_KEY, token)
    return
  }

  await Preferences.set({ key: TOKEN_KEY, value: token })
  localStorage.removeItem(LEGACY_LS_KEY)
}

export async function clearStoredToken(): Promise<void> {
  memoryToken = null

  if (!isNativeApp()) {
    localStorage.removeItem(LEGACY_LS_KEY)
    return
  }

  await Preferences.remove({ key: TOKEN_KEY })
  localStorage.removeItem(LEGACY_LS_KEY)
}

/** Jednorazowa migracja tokenu z localStorage WebView → Preferences. */
export async function migrateLegacyTokenIfNeeded(): Promise<void> {
  if (!isNativeApp()) {
    return
  }

  const legacy = localStorage.getItem(LEGACY_LS_KEY)
  if (!legacy) {
    return
  }

  const { value } = await Preferences.get({ key: TOKEN_KEY })
  if (!value) {
    await Preferences.set({ key: TOKEN_KEY, value: legacy })
  }

  localStorage.removeItem(LEGACY_LS_KEY)
  memoryToken = legacy
}
