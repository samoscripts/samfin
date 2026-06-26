import { useAppInfo } from '@/app/providers/AppInfoProvider'
import EnvironmentBadge from '@/shared/components/EnvironmentBadge'
import {
  getTopbarShellClass,
  isProductionEnvironment,
} from '@/shared/utils/environmentDisplay'

export default function EnvironmentLoginHeader() {
  const info = useAppInfo()

  if (!info || isProductionEnvironment(info.environment)) {
    return null
  }

  return (
    <header
      className={`relative flex items-center h-16 px-4 md:px-6 shrink-0 gap-2 ${getTopbarShellClass(info.environment)}`}
    >
      <EnvironmentBadge />
    </header>
  )
}
