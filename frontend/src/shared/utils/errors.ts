export function getApiErrorMessage(err: unknown, fallback: string): string {
  const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
  return msg ?? fallback
}
