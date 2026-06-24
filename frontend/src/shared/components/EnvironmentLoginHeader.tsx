import { useAppInfo } from '@/app/providers/AppInfoProvider'
import EnvironmentBadge from '@/shared/components/EnvironmentBadge'
import {
  ENV_ACCENT_OVERLAY_CLASS,
  ENV_TOPBAR_BASE_CLASS,
  isProductionEnvironment,
} from '@/shared/utils/environmentDisplay'

export default function EnvironmentLoginHeader() {
  const info = useAppInfo()

  if (!info || isProductionEnvironment(info.environment)) {
    return null
  }

  return (
    <header
      className={`relative flex items-center h-16 px-4 md:px-6 shrink-0 gap-2 ${ENV_TOPBAR_BASE_CLASS}`}
    >
      <div className={ENV_ACCENT_OVERLAY_CLASS} aria-hidden="true" />
      <EnvironmentBadge />
    </header>
  )
}
