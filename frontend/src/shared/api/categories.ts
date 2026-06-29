import api from './client'

/** Kierunek kontekstu wyboru kategorii (frequent picks) — nie atrybut kategorii. */
export type CategoryDirection = 'INCOME' | 'EXPENSE'

export interface Category {
  id: number
  parentId: number | null
  parentName: string | null
  name: string
  description: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export type CategoryPayload = {
  parentId: number | null
  name: string
  description: string | null
  active: boolean
}

export const fetchCategories    = async (): Promise<Category[]> => (await api.get<Category[]>('/categories')).data
export const fetchCategory      = async (id: number): Promise<Category> => (await api.get<Category>(`/categories/${id}`)).data
export const createCategory     = async (p: CategoryPayload): Promise<Category> => (await api.post<Category>('/categories', p)).data
export const updateCategory     = async (id: number, p: Partial<CategoryPayload>): Promise<Category> => (await api.put<Category>(`/categories/${id}`, p)).data
export const deactivateCategory = async (id: number): Promise<void> => { await api.delete(`/categories/${id}`) }
export const deleteCategory     = async (id: number): Promise<void> => { await api.delete(`/categories/${id}`) }

export interface CategoryMergeResult {
  target: Category
  deactivatedSourceId: number
  affected: { items: number; templates: number; rules: number }
}

export interface CategoryUsage {
  items: number
  templates: number
  rules: number
  total: number
}

export function formatCategoryUsageError(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { message?: string; usage?: CategoryUsage } } })?.response?.data
  const message = data?.message ?? fallback
  const usage = data?.usage
  if (!usage || usage.total <= 0) return message

  const parts: string[] = []
  if (usage.items > 0) parts.push(`${usage.items} pozycji transakcji`)
  if (usage.templates > 0) parts.push(`${usage.templates} szablonów`)
  if (usage.rules > 0) parts.push(`${usage.rules} reguł`)

  const detail = parts.length > 0 ? ` (${parts.join(', ')})` : ''
  return `${message}${detail}. Użyj scalenia subkategorii lub usuń powiązania ręcznie.`
}

/** @deprecated use formatCategoryUsageError */
export function formatCategoryDeactivateError(err: unknown, fallback: string): string {
  return formatCategoryUsageError(err, fallback)
}

export const mergeCategories = async (sourceId: number, targetId: number): Promise<CategoryMergeResult> =>
  (await api.post<CategoryMergeResult>('/categories/merge', { sourceId, targetId })).data
