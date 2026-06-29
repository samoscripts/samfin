import api from './client'
import type { CategoryDirection } from './categories'

export const FREQUENT_FETCH_LIMIT = 20
export const FREQUENT_INITIAL_VISIBLE = 5

export interface FrequentCategoryPick {
  categoryId: number
  pickCount: number
  lastUsedAt: string
}

export const fetchFrequentCategoryPicks = async (
  direction: CategoryDirection,
  limit = FREQUENT_FETCH_LIMIT,
): Promise<FrequentCategoryPick[]> =>
  (
    await api.get<FrequentCategoryPick[]>('/category-pick-events/frequent', {
      params: { direction, limit },
    })
  ).data

export const recordCategoryPick = async (
  categoryId: number,
  direction: CategoryDirection,
): Promise<void> => {
  await api.post('/category-pick-events', { categoryId, direction })
}
