import { createContext, useContext } from 'react'

export const RightPanelContext = createContext<HTMLDivElement | null>(null)

export function useRightPanelPortal(): HTMLDivElement | null {
  return useContext(RightPanelContext)
}
