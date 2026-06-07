export type UserRole = 'ADMIN' | 'USER'

export interface AuthUser {
  id: number
  email: string
  forename: string
  surname: string
  displayName: string
  role: UserRole
  avatarSprite: string | null
  avatarIndex: number | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface LoginOption {
  id: number
  email: string
  displayName: string
  avatarSprite: string | null
  avatarIndex: number | null
}
