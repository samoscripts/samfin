import api from './client'

export type CategoryType = 'INCOME' | 'EXPENSE'

export interface Category {
  id: number
  parentId: number | null
  parentName: string | null
  name: string
  type: CategoryType
  description: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export type CategoryPayload = {
  parentId: number | null
  name: string
  type: CategoryType
  description: string | null
  active: boolean
}

export const fetchCategories    = async (): Promise<Category[]> => (await api.get<Category[]>('/categories')).data
export const fetchCategory      = async (id: number): Promise<Category> => (await api.get<Category>(`/categories/${id}`)).data
export const createCategory     = async (p: CategoryPayload): Promise<Category> => (await api.post<Category>('/categories', p)).data
export const updateCategory     = async (id: number, p: Partial<CategoryPayload>): Promise<Category> => (await api.put<Category>(`/categories/${id}`, p)).data
export const deactivateCategory = async (id: number): Promise<void> => { await api.delete(`/categories/${id}`) }
