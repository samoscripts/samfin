export type CategoryPanel = 'create' | 'edit' | 'move' | 'merge'

export interface CategoryPanelUrlState {
  panel: CategoryPanel | null
  categoryId: number | null
}
