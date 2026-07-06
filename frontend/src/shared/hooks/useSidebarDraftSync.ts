import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'

/**
 * Synchronizuje draft panelu bocznego z wartościami z URL.
 * Nie resetuje draftu przy zmianie okresu — tylko przy otwarciu panelu
 * lub gdy zmieni się sygnatura zastosowanych filtrów (np. chip na stronie).
 */
export function useSidebarDraftSync<T>(
  open: boolean,
  applied: T,
  appliedSignature: string,
): [T, Dispatch<SetStateAction<T>>] {
  const [draft, setDraft] = useState(applied)
  const wasOpen = useRef(false)
  const prevSignature = useRef(appliedSignature)

  useEffect(() => {
    if (!open) {
      wasOpen.current = false
      return
    }

    if (!wasOpen.current) {
      setDraft(applied)
      wasOpen.current = true
      prevSignature.current = appliedSignature
      return
    }

    if (prevSignature.current !== appliedSignature) {
      setDraft(applied)
      prevSignature.current = appliedSignature
    }
  }, [open, applied, appliedSignature])

  return [draft, setDraft]
}
