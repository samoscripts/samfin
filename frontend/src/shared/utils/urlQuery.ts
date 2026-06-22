/** Parse comma-separated query value into a non-empty string array. */
export function parseCommaList(value: string | null): string[] {
  if (!value?.trim()) return []
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Serialize string array as comma-separated query value; omit when empty. */
export function serializeCommaList(values: string[] | undefined): string | undefined {
  if (!values?.length) return undefined
  return values.join(',')
}

export function parsePositiveInt(value: string | null): number | undefined {
  if (!value?.trim()) return undefined
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

export function parseOptionalString(value: string | null): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

/** Build URLSearchParams from key/value pairs; skip null, undefined and empty strings. */
export function buildSearchParams(
  entries: Record<string, string | number | undefined | null>,
): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(entries)) {
    if (value === undefined || value === null || value === '') continue
    params.set(key, String(value))
  }
  return params
}

/** Compare two URLSearchParams for equality (order-independent). */
export function searchParamsEqual(a: URLSearchParams, b: URLSearchParams): boolean {
  const keysA = [...new Set([...a.keys()])].sort()
  const keysB = [...new Set([...b.keys()])].sort()
  if (keysA.length !== keysB.length) return false
  return keysA.every((key, i) => keysB[i] === key && a.get(key) === b.get(key))
}
