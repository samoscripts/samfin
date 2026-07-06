import { FlaskConical } from 'lucide-react'

export default function MockBanner() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
      <FlaskConical size={18} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
      <div>
        <p className="font-medium">Podgląd — dane przykładowe</p>
        <p className="text-amber-800/80 dark:text-amber-200/80 mt-0.5">
          To plansza UI z mockowymi danymi. Po akceptacji wyglądu podłączymy backend{' '}
          <code className="text-xs bg-amber-100/80 dark:bg-amber-900/50 px-1 rounded">GET /api/reports/breakdown</code>.
        </p>
      </div>
    </div>
  )
}
