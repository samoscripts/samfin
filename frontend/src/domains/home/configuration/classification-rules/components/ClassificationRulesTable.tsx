import { Pencil, Trash2, GripVertical } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ClassificationRule } from '@/shared/api/classificationRules'
import { DIRECTION_LABEL_BY_VALUE } from '@/domains/home/transactions/constants/labels'
import Pill from '@/shared/components/Pill'
import { extractDirectionFromConditions, additionalConditionsCount } from '../ruleConditionMeta'

function formatConditionsSummary(rule: ClassificationRule): string {
  const direction = extractDirectionFromConditions(rule.conditions.conditions)
  const extra = additionalConditionsCount(rule.conditions.conditions)
  const directionLabel = direction ? (DIRECTION_LABEL_BY_VALUE[direction] ?? direction) : '—'
  if (extra === 0) return directionLabel
  return `${directionLabel} · ${extra} dodatk.`
}

export interface ClassificationRulesTableProps {
  rules: ClassificationRule[]
  sortable: boolean
  onReorder: (rules: ClassificationRule[]) => void
  onEdit: (rule: ClassificationRule) => void
  onDelete: (rule: ClassificationRule) => void
}

export default function ClassificationRulesTable({
  rules,
  sortable,
  onReorder,
  onEdit,
  onDelete,
}: ClassificationRulesTableProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = rules.findIndex((r) => r.id === active.id)
    const newIndex = rules.findIndex((r) => r.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    onReorder(arrayMove(rules, oldIndex, newIndex))
  }

  const desktopTable = (
    <table className="min-w-full text-sm">
      <thead>
        <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-left text-xs text-gray-500 uppercase tracking-wide">
          {sortable && <th className="w-10 px-2 py-3" />}
          <th className="px-4 py-3">Priorytet</th>
          <th className="px-4 py-3">Nazwa</th>
          <th className="px-4 py-3">Warunki</th>
          <th className="px-4 py-3">Status</th>
          <th className="px-4 py-3 w-24" />
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
        {rules.map((rule) =>
          sortable ? (
            <SortableRuleRow key={rule.id} rule={rule} onEdit={onEdit} onDelete={onDelete} />
          ) : (
            <StaticRuleRow key={rule.id} rule={rule} onEdit={onEdit} onDelete={onDelete} />
          ),
        )}
      </tbody>
    </table>
  )

  const mobileList = rules.map((rule) =>
    sortable ? (
      <SortableRuleCard key={rule.id} rule={rule} onEdit={onEdit} onDelete={onDelete} />
    ) : (
      <StaticRuleCard key={rule.id} rule={rule} onEdit={onEdit} onDelete={onDelete} />
    ),
  )

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="hidden md:block overflow-x-auto">
        {sortable ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={rules.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              {desktopTable}
            </SortableContext>
          </DndContext>
        ) : (
          desktopTable
        )}
      </div>

      <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
        {sortable ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={rules.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              {mobileList}
            </SortableContext>
          </DndContext>
        ) : (
          mobileList
        )}
      </div>
    </div>
  )
}

function RuleRowCells({
  rule,
  onEdit,
  onDelete,
  grip,
}: {
  rule: ClassificationRule
  onEdit: (rule: ClassificationRule) => void
  onDelete: (rule: ClassificationRule) => void
  grip?: React.ReactNode
}) {
  return (
    <>
      {grip}
      <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-400 whitespace-nowrap">
        {rule.priority}
      </td>
      <td className="px-4 py-3 max-w-xs">
        <p className="font-medium text-gray-900 dark:text-gray-100">{rule.name}</p>
        {rule.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{rule.description}</p>
        )}
      </td>
      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
        {formatConditionsSummary(rule)}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <RuleStatusBadge enabled={rule.enabled} />
      </td>
      <td className="px-4 py-3">
        <RuleActions rule={rule} onEdit={onEdit} onDelete={onDelete} />
      </td>
    </>
  )
}

function SortableRuleRow({
  rule,
  onEdit,
  onDelete,
}: {
  rule: ClassificationRule
  onEdit: (rule: ClassificationRule) => void
  onDelete: (rule: ClassificationRule) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: rule.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const grip = (
    <td className="px-2 py-3 text-gray-400">
      <button
        type="button"
        className="p-1 cursor-grab active:cursor-grabbing touch-none"
        aria-label="Zmień kolejność"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>
    </td>
  )

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
      <RuleRowCells rule={rule} onEdit={onEdit} onDelete={onDelete} grip={grip} />
    </tr>
  )
}

function StaticRuleRow({
  rule,
  onEdit,
  onDelete,
}: {
  rule: ClassificationRule
  onEdit: (rule: ClassificationRule) => void
  onDelete: (rule: ClassificationRule) => void
}) {
  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
      <RuleRowCells rule={rule} onEdit={onEdit} onDelete={onDelete} />
    </tr>
  )
}

function RuleCardContent({
  rule,
  onEdit,
  onDelete,
  grip,
}: {
  rule: ClassificationRule
  onEdit: (rule: ClassificationRule) => void
  onDelete: (rule: ClassificationRule) => void
  grip?: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2">
      {grip}
      <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{rule.name}</span>
            <RuleStatusBadge enabled={rule.enabled} />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Priorytet: <span className="font-mono">{rule.priority}</span>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatConditionsSummary(rule)}</p>
        </div>
        <RuleActions rule={rule} onEdit={onEdit} onDelete={onDelete} />
      </div>
    </div>
  )
}

function SortableRuleCard({
  rule,
  onEdit,
  onDelete,
}: {
  rule: ClassificationRule
  onEdit: (rule: ClassificationRule) => void
  onDelete: (rule: ClassificationRule) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: rule.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const grip = (
    <button
      type="button"
      className="p-1 mt-0.5 text-gray-400 cursor-grab active:cursor-grabbing touch-none shrink-0"
      aria-label="Zmień kolejność"
      {...attributes}
      {...listeners}
    >
      <GripVertical size={16} />
    </button>
  )

  return (
    <div ref={setNodeRef} style={style} className="p-4">
      <RuleCardContent rule={rule} onEdit={onEdit} onDelete={onDelete} grip={grip} />
    </div>
  )
}

function StaticRuleCard({
  rule,
  onEdit,
  onDelete,
}: {
  rule: ClassificationRule
  onEdit: (rule: ClassificationRule) => void
  onDelete: (rule: ClassificationRule) => void
}) {
  return (
    <div className="p-4">
      <RuleCardContent rule={rule} onEdit={onEdit} onDelete={onDelete} />
    </div>
  )
}

function RuleStatusBadge({ enabled }: { enabled: boolean }) {
  return (
    <Pill variant={enabled ? 'success' : 'neutral'}>
      {enabled ? 'Aktywna' : 'Wyłączona'}
    </Pill>
  )
}

function RuleActions({
  rule,
  onEdit,
  onDelete,
}: {
  rule: ClassificationRule
  onEdit: (rule: ClassificationRule) => void
  onDelete: (rule: ClassificationRule) => void
}) {
  return (
    <div className="flex gap-1 shrink-0">
      <button
        type="button"
        onClick={() => onEdit(rule)}
        className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label="Edytuj"
      >
        <Pencil size={14} />
      </button>
      <button
        type="button"
        onClick={() => onDelete(rule)}
        className="p-1.5 rounded-md text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
        aria-label="Usuń"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}
