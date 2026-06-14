import { labelCls } from './formClasses'

export interface FormFieldProps {
  label: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

export default function FormField({ label, required, children, className }: FormFieldProps) {
  return (
    <div className={className}>
      <label className={labelCls}>
        {label}
        {required ? ' *' : ''}
      </label>
      {children}
    </div>
  )
}
