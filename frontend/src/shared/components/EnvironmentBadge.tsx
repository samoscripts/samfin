import { useAppInfo } from '@/app/providers/AppInfoProvider'
import {
  getEnvironmentPillClass,
  getEnvironmentShortLabel,
  isProductionEnvironment,
} from '@/shared/utils/environmentDisplay'
import { PILL_BASE, PILL_SIZE_CLASS } from './pillVariants'

interface EnvironmentBadgeProps {
  className?: string
}

export default function EnvironmentBadge({ className = '' }: EnvironmentBadgeProps) {
  const info = useAppInfo()

  if (!info || isProductionEnvironment(info.environment)) {
    return null
  }

  return (
    <span
      className={[
        PILL_BASE,
        PILL_SIZE_CLASS.xs,
        getEnvironmentPillClass(info.environment),
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      title={`Środowisko: ${info.environment}`}
    >
      {getEnvironmentShortLabel(info.environment)}
    </span>
  )
}
