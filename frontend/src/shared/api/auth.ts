import api from './client'
import { AuthUser, LoginOption } from '@/shared/types/auth'

export async function fetchLoginOptions(): Promise<LoginOption[]> {
  const res = await api.get<LoginOption[]>('/auth/login-options')
  return res.data
}

export async function fetchMe(): Promise<AuthUser> {
  const res = await api.get<{ user: AuthUser }>('/auth/me')
  return res.data.user
}

export async function updateMe(payload: {
  forename?: string
  surname?: string
  displayName?: string
  avatarSprite?: string | null
  avatarIndex?: number | null
  currentPassword?: string
  newPassword?: string
}): Promise<AuthUser> {
  const res = await api.put<{ user: AuthUser }>('/auth/me', payload)
  return res.data.user
}

export async function apiLogin(
  email: string,
  password: string,
): Promise<{ token: string; user: AuthUser }> {
  const res = await api.post<{ success: boolean; token: string; user: AuthUser; message?: string }>(
    '/auth/login',
    { email, password },
  )
  if (!res.data.success) {
    throw new Error(res.data.message ?? 'Logowanie nieudane.')
  }
  return { token: res.data.token, user: res.data.user }
}

export async function apiLogout(): Promise<void> {
  await api.post('/auth/logout')
}
