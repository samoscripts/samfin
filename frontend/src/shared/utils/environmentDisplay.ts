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

/** Dev shell: sidebar + topbar share deep red (#360000). */
export const DEV_SHELL_BG_CLASS = 'bg-[#360000]'

export const PROD_SIDEBAR_BG_CLASS = 'bg-gray-900'

export const PROD_TOPBAR_CLASS =
  'bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800'

export function isProductionEnvironment(environment: string | null | undefined): boolean {
  return environment === 'prod'
}

export function isDevEnvironment(environment: string | null | undefined): boolean {
  return environment === 'dev'
}

export function getEnvironmentShortLabel(environment: string): string {
  return ENV_SHORT_LABELS[environment] ?? environment.toUpperCase()
}

export function getEnvironmentLabel(environment: string): string {
  return ENV_LABELS[environment] ?? environment
}

export function getSidebarShellClass(environment: string | null | undefined): string {
  return isDevEnvironment(environment) ? DEV_SHELL_BG_CLASS : PROD_SIDEBAR_BG_CLASS
}

export function getTopbarShellClass(environment: string | null | undefined): string {
  if (isDevEnvironment(environment)) {
    return `${DEV_SHELL_BG_CLASS} border-b border-white/10`
  }
  return PROD_TOPBAR_CLASS
}

export function getEnvironmentPillClass(environment: string): string {
  switch (environment) {
    case 'dev':
      return 'bg-[#c9a96e]/15 text-[#e0cfad] border border-[#c9a96e]/35'
    case 'staging':
      return 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800'
    case 'test':
      return 'bg-gray-100 text-gray-600 border border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600'
    default:
      return 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800'
  }
}
