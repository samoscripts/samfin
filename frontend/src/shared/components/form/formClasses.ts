/** Inputs in transaction filters / side panels (slightly muted background). */
export const inputCls =
  'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 ' +
  'bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 ' +
  'placeholder-gray-400 dark:placeholder-gray-600 ' +
  'focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40'

export const selectCls =
  'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 ' +
  'bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 ' +
  'focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40'

/** Inputs in configuration / admin forms (white background). */
export const configInputCls =
  'w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ' +
  'px-3 py-2 text-sm text-gray-900 dark:text-gray-100 ' +
  'focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40 focus:border-[#c9a96e] ' +
  'transition-colors placeholder:text-gray-400'

export const configSelectCls = configInputCls

export const labelCls = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1'

export const textareaCls = [configInputCls, 'resize-none'].join(' ')

export const btnPrimary =
  'px-5 py-2 rounded-lg bg-[#1a472a] hover:bg-[#163526] disabled:opacity-50 ' +
  'text-white text-sm font-medium transition-colors'

export const btnPrimaryModal =
  'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ' +
  'text-white hover:opacity-90 transition-opacity disabled:opacity-60 ' +
  'bg-[#1c4230]'

export const btnSecondary =
  'px-5 py-2 rounded-lg border border-gray-200 dark:border-gray-700 ' +
  'text-gray-700 dark:text-gray-300 text-sm font-medium ' +
  'hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'

export const btnSecondaryModal =
  'flex-1 px-4 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-700 ' +
  'disabled:opacity-60'
