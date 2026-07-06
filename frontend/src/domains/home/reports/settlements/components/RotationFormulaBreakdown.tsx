import type {
  PersonKey,
  SettlementPersonOutlook,
  SettlementRotationState,
} from '@/shared/api/settlements'
import {
  PERSON_LABELS,
  PERSON_THEMES,
  SETTLEMENT_FORMULA_HINTS,
  SETTLEMENT_UI_LABELS,
  formatCatchUpDetail,
  personSectionClasses,
} from '@/domains/home/reports/settlements/constants'
import { formatAmount } from '@/shared/utils/format'
import RotationAnchorBadge from '@/domains/home/reports/settlements/components/RotationAnchorBadge'

function FormulaRow({
  label,
  amount,
  sign,
  emphasis,
  hint,
  detail,
}: {
  label: string
  amount: number
  sign?: '+' | '−' | '='
  emphasis?: boolean
  hint?: string
  detail?: string
}) {
  return (
    <div className="text-sm">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-gray-600 dark:text-gray-400">
          {sign && <span className="inline-block w-4 tabular-nums">{sign}</span>}
          {label}
        </span>
        <span
          className={[
            'tabular-nums shrink-0',
            emphasis ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300',
          ].join(' ')}
        >
          {formatAmount(amount)}
        </span>
      </div>
      {detail && (
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5 ml-4 tabular-nums">
          {detail}
        </p>
      )}
      {hint && <p className="text-xs text-gray-400 mt-0.5 ml-4">{hint}</p>}
    </div>
  )
}

function RotationFormulaRows({
  person,
  rotation,
  baseAmount,
  catchUpAmount,
  walletNetCumulative,
  rotationPrepaid,
  suggestedAmount,
  suggestedAmountRaw,
  resultLabel,
  showCatchUpDetail,
}: {
  person: PersonKey
  rotation: SettlementRotationState
  baseAmount: number
  catchUpAmount: number
  walletNetCumulative: number
  rotationPrepaid: number
  suggestedAmount: number
  suggestedAmountRaw?: number
  resultLabel: string
  showCatchUpDetail: boolean
}) {
  const personStan = person === 'maciek' ? rotation.stanMaciek : rotation.stanBasia
  const rawSum = catchUpAmount + walletNetCumulative - rotationPrepaid
  const rawValue = suggestedAmountRaw ?? rawSum

  return (
    <>
      <FormulaRow
        label={
          catchUpAmount === baseAmount && personStan >= 0
            ? 'Wyrównanie (= kwota bazowa)'
            : 'Wyrównanie (catch-up)'
        }
        amount={catchUpAmount}
        sign="+"
        hint={
          personStan < 0 ? SETTLEMENT_FORMULA_HINTS.catchUpNegative : SETTLEMENT_FORMULA_HINTS.catchUpNonNegative
        }
        detail={showCatchUpDetail ? formatCatchUpDetail(person, rotation, catchUpAmount) : undefined}
      />
      <FormulaRow
        label="Saldo portfeli (skumulowane)"
        amount={walletNetCumulative}
        sign="+"
        hint={SETTLEMENT_FORMULA_HINTS.walletNet}
      />
      <FormulaRow
        label="Prepaid rotacji"
        amount={rotationPrepaid}
        sign="−"
        hint={SETTLEMENT_FORMULA_HINTS.prepaid}
      />
      <FormulaRow
        label="Suma składowych"
        amount={rawSum}
        sign="="
        detail={`${formatAmount(catchUpAmount)} + ${formatAmount(walletNetCumulative)} − ${formatAmount(rotationPrepaid)}`}
        hint={SETTLEMENT_FORMULA_HINTS.rawBeforeMax}
      />
      {rawValue < 0 && (
        <p className="text-xs text-gray-500 ml-4">
          Suma ujemna ({formatAmount(rawValue)}) → po max(0, …) wynik to 0 zł
        </p>
      )}
      <div className="border-t border-gray-200/80 dark:border-gray-700/80 pt-2 mt-2">
        <FormulaRow label={resultLabel} amount={suggestedAmount} sign="=" emphasis />
      </div>
    </>
  )
}

function PersonFormulaBlock({
  person,
  outlook,
  rotation,
}: {
  person: PersonKey
  outlook: SettlementPersonOutlook
  rotation: SettlementRotationState
}) {
  const theme = PERSON_THEMES[person]
  const sim = outlook.afterAnchorDepositSimulation
  const baseAmount = rotation.baseAmount
  const personStan = person === 'maciek' ? rotation.stanMaciek : rotation.stanBasia

  const queueActive = outlook.isAnchor

  return (
    <div
      className={[
        'rounded-xl border p-4 space-y-3',
        personSectionClasses(person, { isAnchor: queueActive, variant: 'section' }),
      ].join(' ')}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className={['text-sm font-semibold', theme.label].join(' ')}>
          {PERSON_LABELS[person]}
          {!outlook.isAnchor && ' — podgląd'}
        </p>
        {outlook.isAnchor && <RotationAnchorBadge person={person} />}
        {!outlook.isAnchor && sim && (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-200/80 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
            {SETTLEMENT_UI_LABELS.simulationBadge}
          </span>
        )}
      </div>

      {outlook.isAnchor && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Σ {PERSON_LABELS.maciek}: {formatAmount(rotation.maciekDepositsTotal)} · Σ{' '}
          {PERSON_LABELS.basia}: {formatAmount(rotation.basiaDepositsTotal)} · stan{' '}
          {PERSON_LABELS[person]}: {formatAmount(personStan)}
        </p>
      )}

      {outlook.isAnchor ? (
        <RotationFormulaRows
          person={person}
          rotation={rotation}
          baseAmount={baseAmount}
          catchUpAmount={outlook.catchUpAmount}
          walletNetCumulative={outlook.walletNetCumulative}
          rotationPrepaid={outlook.rotationPrepaid}
          suggestedAmount={outlook.suggestedAmount}
          suggestedAmountRaw={outlook.suggestedAmountRaw}
          resultLabel="Sugerowana wpłata"
          showCatchUpDetail
        />
      ) : sim ? (
        <>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {SETTLEMENT_UI_LABELS.simulationAfterAnchor(
              PERSON_LABELS[sim.anchorPerson],
              formatAmount(sim.anchorPaidAmount),
            )}
          </p>
          <RotationFormulaRows
            person={person}
            rotation={rotation}
            baseAmount={baseAmount}
            catchUpAmount={sim.catchUpAmount}
            walletNetCumulative={sim.walletNetCumulative}
            rotationPrepaid={sim.rotationPrepaid}
            suggestedAmount={sim.suggestedAmount}
            resultLabel="Sugerowana wpłata (symulacja)"
            showCatchUpDetail={false}
          />
          <div className="border-t border-gray-200/60 dark:border-gray-700/60 pt-3 space-y-2">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {SETTLEMENT_UI_LABELS.formulaCurrentState}
            </p>
            <FormulaRow label="Saldo portfeli (skumulowane)" amount={outlook.walletNetCumulative} />
            <FormulaRow label="Prepaid rotacji" amount={outlook.rotationPrepaid} sign="−" />
            <FormulaRow label="Podgląd kwoty" amount={outlook.suggestedAmount} sign="=" emphasis />
          </div>
        </>
      ) : (
        <>
          <FormulaRow label="Saldo portfeli (skumulowane)" amount={outlook.walletNetCumulative} />
          <FormulaRow label="Prepaid rotacji" amount={outlook.rotationPrepaid} sign="−" />
          <div className="border-t border-gray-200/80 dark:border-gray-700/80 pt-2 mt-2">
            <FormulaRow label="Podgląd kwoty" amount={outlook.suggestedAmount} sign="=" emphasis />
          </div>
        </>
      )}

      {outlook.formulaSummary && !sim && (
        <p className="text-xs text-gray-400 pt-1">{outlook.formulaSummary}</p>
      )}
      {sim?.formulaSummary && (
        <p className="text-xs text-gray-400 pt-1">{sim.formulaSummary}</p>
      )}
    </div>
  )
}

export default function RotationFormulaBreakdown({
  rotation,
  personOutlook,
}: {
  rotation: SettlementRotationState
  personOutlook: Record<PersonKey, SettlementPersonOutlook>
}) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          Wyliczenie kwoty rotacyjnej
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {SETTLEMENT_FORMULA_HINTS.formulaIntro}
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PersonFormulaBlock
          person="maciek"
          outlook={personOutlook.maciek}
          rotation={rotation}
        />
        <PersonFormulaBlock
          person="basia"
          outlook={personOutlook.basia}
          rotation={rotation}
        />
      </div>
    </div>
  )
}
