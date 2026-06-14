export interface FormErrorProps {
  message: string
  className?: string
}

export default function FormError({ message, className }: FormErrorProps) {
  return (
    <div
      className={[
        'rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800',
        'px-4 py-3 text-sm text-red-700 dark:text-red-300 mb-4',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {message}
    </div>
  )
}
