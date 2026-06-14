import type { Category, CategoryType } from '@/shared/api/categories'

export function formatCategoryLabel(c: Pick<Category, 'name' | 'parentName'>): string {
  return c.parentName ? `${c.parentName} / ${c.name}` : c.name
}

export function filterActiveCategories(categories: Category[]): Category[] {
  return categories.filter((c) => c.active)
}

export function filterCategoriesForDirection(
  categories: Category[],
  direction: CategoryType | string,
): Category[] {
  return categories.filter((c) => c.active && c.type === direction)
}
