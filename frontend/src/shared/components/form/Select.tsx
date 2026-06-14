import { selectCls } from './formClasses'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  className?: string
}

export default function Select({ className, children, ...rest }: SelectProps) {
  return (
    <select className={className ?? selectCls} {...rest}>
      {children}
    </select>
  )
}
