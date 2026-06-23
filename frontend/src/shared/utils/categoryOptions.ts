import type { Category, CategoryDirection } from '@/shared/api/categories'

export function formatCategoryLabel(c: Pick<Category, 'name' | 'parentName'>): string {
  return c.parentName ? `${c.parentName} / ${c.name}` : c.name
}

export function filterActiveCategories(categories: Category[]): Category[] {
  return categories.filter((c) => c.active)
}

export function categorySupportsDirection(
  category: Pick<Category, 'directions'>,
  direction: CategoryDirection,
): boolean {
  return category.directions.includes(direction)
}

export function parentSupportsChildDirections(
  parent: Pick<Category, 'directions'>,
  childDirections: CategoryDirection[],
): boolean {
  return childDirections.every((direction) => parent.directions.includes(direction))
}

export function filterCategoriesForDirection(
  categories: Category[],
  direction: CategoryDirection | string,
): Category[] {
  return categories.filter(
    (c) => c.active && categorySupportsDirection(c, direction as CategoryDirection),
  )
}

export function isSelectableCategory(c: Category): boolean {
  return c.active && c.parentId != null
}

export interface CategoryGroup {
  parentId: number
  parentName: string
  directions: CategoryDirection[]
  children: Category[]
}

export function buildCategoryGroups(categories: Category[]): CategoryGroup[] {
  const parents = categories
    .filter((c) => c.active && c.parentId == null)
    .sort((a, b) => a.name.localeCompare(b.name, 'pl'))

  const childrenByParent = new Map<number, Category[]>()
  for (const c of categories) {
    if (!c.active || c.parentId == null) continue
    const list = childrenByParent.get(c.parentId) ?? []
    list.push(c)
    childrenByParent.set(c.parentId, list)
  }

  const groups: CategoryGroup[] = []
  for (const parent of parents) {
    const children = (childrenByParent.get(parent.id) ?? []).sort((a, b) =>
      a.name.localeCompare(b.name, 'pl'),
    )
    if (children.length === 0) continue
    groups.push({
      parentId: parent.id,
      parentName: parent.name,
      directions: parent.directions,
      children,
    })
  }

  return groups
}

function normalizeSearch(text: string): string {
  return text.trim().toLocaleLowerCase('pl')
}

export function categoryMatchesQuery(c: Category, query: string): boolean {
  if (!query) return true
  const q = normalizeSearch(query)
  const label = normalizeSearch(formatCategoryLabel(c))
  const name = normalizeSearch(c.name)
  const parent = normalizeSearch(c.parentName ?? '')
  return label.includes(q) || name.includes(q) || parent.includes(q)
}

export function filterCategoryGroups(groups: CategoryGroup[], query: string): CategoryGroup[] {
  if (!normalizeSearch(query)) return groups

  return groups
    .map((g) => ({
      ...g,
      children: g.children.filter((c) => categoryMatchesQuery(c, query)),
    }))
    .filter((g) => g.children.length > 0)
}

export function findCategoryById(categories: Category[], id: number | null | undefined): Category | undefined {
  if (id == null) return undefined
  return categories.find((c) => c.id === id)
}

export function prepareCategoriesForSelect(
  categories: Category[],
  direction?: CategoryDirection | '',
): Category[] {
  const active = filterActiveCategories(categories)
  if (direction === 'EXPENSE' || direction === 'INCOME') {
    return filterCategoriesForDirection(active, direction)
  }
  return active
}
