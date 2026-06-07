import api from './client'
import { AuthUser } from '@/shared/types/auth'

export type UserPayload = {
  email: string
  forename: string
  surname: string
  displayName: string
  role: 'ADMIN' | 'USER'
  active: boolean
  avatarSprite: string | null
  avatarIndex: number | null
  password?: string
  newPassword?: string
}

export async function fetchUsers(): Promise<AuthUser[]> {
  const res = await api.get<AuthUser[]>('/users')
  return res.data
}

export async function fetchUser(id: number): Promise<AuthUser> {
  const res = await api.get<AuthUser>(`/users/${id}`)
  return res.data
}

export async function createUser(payload: UserPayload): Promise<AuthUser> {
  const res = await api.post<AuthUser>('/users', payload)
  return res.data
}

export async function updateUser(id: number, payload: Partial<UserPayload>): Promise<AuthUser> {
  const res = await api.put<AuthUser>(`/users/${id}`, payload)
  return res.data
}

export async function deactivateUser(id: number): Promise<void> {
  await api.delete(`/users/${id}`)
}
