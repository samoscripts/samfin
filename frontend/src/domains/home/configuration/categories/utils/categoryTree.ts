import type { Category, CategoryDirection } from '@/shared/api/categories'
import { categoryMatchesQuery, parentSupportsChildDirections } from '@/shared/utils/categoryOptions'

export interface CategoryTreeNode {
  parent: Category
  children: Category[]
}

export interface CategoryTreeData {
  groups: CategoryTreeNode[]
  orphans: Category[]
}

function sortByName(a: Category, b: Category): number {
  return a.name.localeCompare(b.name, 'pl')
}

export function buildCategoryTree(categories: Category[]): CategoryTreeData {
  const byId = new Map(categories.map((c) => [c.id, c]))
  const roots = categories.filter((c) => c.parentId == null).sort(sortByName)
  const childrenByParent = new Map<number, Category[]>()

  for (const c of categories) {
    if (c.parentId == null) continue
    const list = childrenByParent.get(c.parentId) ?? []
    list.push(c)
    childrenByParent.set(c.parentId, list)
  }

  const groups: CategoryTreeNode[] = roots.map((parent) => ({
    parent,
    children: (childrenByParent.get(parent.id) ?? []).sort(sortByName),
  }))

  const orphans: Category[] = []
  for (const c of categories) {
    if (c.parentId == null) continue
    const parent = byId.get(c.parentId)
    if (!parent || !parent.active) {
      orphans.push(c)
    }
  }
  orphans.sort(sortByName)

  return { groups, orphans }
}

export function filterCategoryTree(
  tree: CategoryTreeData,
  query: string,
  direction?: CategoryDirection | '',
): CategoryTreeData {
  const q = query.trim()
  const hasDirection = direction === 'EXPENSE' || direction === 'INCOME'

  const matchesDirection = (c: Category) =>
    !hasDirection || c.directions.includes(direction)

  const filterChild = (c: Category) =>
    matchesDirection(c) && (!q || categoryMatchesQuery(c, q))

  const filterParent = (c: Category) => matchesDirection(c)

  const groups = tree.groups
    .map((node) => ({
      parent: node.parent,
      children: node.children.filter(filterChild),
    }))
    .filter((node) => {
      if (node.children.length > 0) return true
      if (!filterParent(node.parent)) return false
      if (!q) return true
      return categoryMatchesQuery(node.parent, q)
    })

  const orphans = tree.orphans.filter(filterChild)

  return { groups, orphans }
}

export function canMoveChildToParent(child: Category, parent: Category): boolean {
  if (child.parentId === parent.id) return false
  if (parent.parentId != null) return false
  return parentSupportsChildDirections(parent, child.directions)
}

export function isMergeTarget(source: Category, target: Category): boolean {
  if (source.id === target.id) return false
  if (source.parentId == null || target.parentId == null) return false
  return parentSupportsChildDirections(target, source.directions)
}
