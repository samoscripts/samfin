import type { BreakdownDirection, BreakdownDirections } from '@/domains/home/reports/shared/types/breakdown'

const VALID_DIRECTIONS = new Set<BreakdownDirection>(['EXPENSE', 'INCOME'])

export function hasBothBreakdownDirections(directions: BreakdownDirections): boolean {
  return directions.includes('EXPENSE') && directions.includes('INCOME')
}

export function normalizeBreakdownDirections(raw: unknown): BreakdownDirections {
  if (Array.isArray(raw)) {
    const list = raw.filter(
      (value): value is BreakdownDirection =>
        typeof value === 'string' && VALID_DIRECTIONS.has(value as BreakdownDirection),
    )
    return list.length > 0 ? [...new Set(list)] : ['EXPENSE']
  }

  if (raw === 'INCOME' || raw === 'EXPENSE') {
    return [raw]
  }

  return ['EXPENSE']
}

export function parseBreakdownDirections(searchParams: URLSearchParams): BreakdownDirections {
  const csv = searchParams.get('reportDirections')
  if (csv) {
    const tokens = csv
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
    const valid = tokens.filter((token): token is BreakdownDirection =>
      VALID_DIRECTIONS.has(token as BreakdownDirection),
    )
    return valid.length > 0 ? [...new Set(valid)] : ['EXPENSE']
  }

  return normalizeBreakdownDirections(searchParams.get('reportDirection'))
}

export function serializeBreakdownDirections(
  directions: BreakdownDirections,
  params: URLSearchParams,
): URLSearchParams {
  const normalized = normalizeBreakdownDirections(directions)
  params.delete('reportDirection')
  params.delete('reportDirections')

  if (normalized.length === 1 && normalized[0] === 'EXPENSE') {
    return params
  }

  if (normalized.length === 1) {
    params.set('reportDirections', normalized[0])
    return params
  }

  params.set('reportDirections', normalized.join(','))
  return params
}

export function primaryBreakdownChartDirection(directions: BreakdownDirections): BreakdownDirection {
  if (directions.includes('EXPENSE')) return 'EXPENSE'
  return directions[0] ?? 'EXPENSE'
}
