import { Activity, ExternalLink } from 'lucide-react'
import Pill from '@/shared/components/Pill'
import { useAppInfo } from '@/shared/hooks/useAppInfo'
import {
  getEnvironmentLabel,
  isProductionEnvironment,
} from '@/shared/utils/environmentDisplay'

interface AppFooterProps {
  variant?: 'full' | 'minimal'
}

export default function AppFooter({ variant = 'full' }: AppFooterProps) {
  const info = useAppInfo()

  const version = info?.version ?? '…'
  const isNonProd = info != null && !isProductionEnvironment(info.environment)
  const envLabel = info ? getEnvironmentLabel(info.environment) : null

  return (
    <footer className="shrink-0 border-t border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-4 py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
        <span>© {new Date().getFullYear()} SamSoft</span>
        <span className="text-gray-300 dark:text-gray-700" aria-hidden="true">
          ·
        </span>
        <span className="text-gray-500 dark:text-gray-400">SamFin v{version}</span>

        {variant === 'full' && isNonProd && envLabel && (
          <>
            <span className="text-gray-300 dark:text-gray-700" aria-hidden="true">
              ·
            </span>
            <Pill variant="warning" size="xs">
              {envLabel}
            </Pill>
          </>
        )}

        {variant === 'full' && isNonProd && info?.build && (
          <>
            <span className="text-gray-300 dark:text-gray-700" aria-hidden="true">
              ·
            </span>
            <span>Build {info.build}</span>
          </>
        )}

        {variant === 'full' && isNonProd && info?.commit && (
          <>
            <span className="text-gray-300 dark:text-gray-700" aria-hidden="true">
              ·
            </span>
            <span className="font-mono">{info.commit}</span>
          </>
        )}

        {variant === 'full' && isNonProd && (
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 ml-auto">
            {info?.profilerUrl && (
              <a
                href={info.profilerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
              >
                <Activity size={12} />
                Profiler
                <ExternalLink size={10} className="opacity-60" />
              </a>
            )}
            <a
              href="/api/health"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              Health
              <ExternalLink size={10} className="opacity-60" />
            </a>
          </span>
        )}
      </div>
    </footer>
  )
}
