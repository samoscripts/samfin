export const ENV_LABELS: Record<string, string> = {
  dev: 'Development',
  prod: 'Production',
  test: 'Test',
  staging: 'Staging',
}

export const ENV_SHORT_LABELS: Record<string, string> = {
  dev: 'DEV',
  prod: 'PROD',
  test: 'TEST',
  staging: 'STAGING',
}

export function isProductionEnvironment(environment: string | null | undefined): boolean {
  return environment === 'prod'
}

export function getEnvironmentShortLabel(environment: string): string {
  return ENV_SHORT_LABELS[environment] ?? environment.toUpperCase()
}

export function getEnvironmentLabel(environment: string): string {
  return ENV_LABELS[environment] ?? environment
}

export function getEnvironmentPillClass(environment: string): string {
  switch (environment) {
    case 'dev':
      return 'bg-[#6b1d3a]/10 text-[#6b1d3a] border border-[#6b1d3a]/30 dark:bg-[#6b1d3a]/25 dark:text-[#f0b8c4] dark:border-[#6b1d3a]/40'
    case 'staging':
      return 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800'
    case 'test':
      return 'bg-gray-100 text-gray-600 border border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600'
    default:
      return 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800'
  }
}

/** Overlay: single bordo hue fading to transparent, top → bottom */
export const ENV_ACCENT_OVERLAY_CLASS =
  'absolute inset-0 bg-gradient-to-b from-[#6b1d3a]/22 to-transparent dark:from-[#6b1d3a]/32 pointer-events-none'

export const ENV_TOPBAR_BASE_CLASS =
  'bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800'
