const ALLOWED_RETURN_PATH = '/transactions'

/** Accepts only internal /transactions URLs (path + optional query). */
export function parseSafeReturnUrl(raw: string): string | null {
  try {
    const decoded = decodeURIComponent(raw.trim())
    if (!decoded.startsWith('/') || decoded.startsWith('//')) return null

    const qIndex = decoded.indexOf('?')
    const path = qIndex === -1 ? decoded : decoded.slice(0, qIndex)
    if (path !== ALLOWED_RETURN_PATH) return null

    return decoded
  } catch {
    return null
  }
}
