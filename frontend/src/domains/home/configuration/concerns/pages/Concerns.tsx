import SimpleEntityPage, { type SimpleEntity } from '../../shared/SimpleEntityPage'
import {
  fetchConcerns,
  createConcern,
  updateConcern,
  deactivateConcern,
  type Concern,
} from '@/shared/api/concerns'

type ConcernEntity = Concern & SimpleEntity

const create = (p: Record<string, unknown>) =>
  createConcern(p as Parameters<typeof createConcern>[0]) as Promise<ConcernEntity>

const update = (id: number, p: Record<string, unknown>) =>
  updateConcern(id, p as Parameters<typeof updateConcern>[1]) as Promise<ConcernEntity>

export default function Concerns() {
  return (
    <SimpleEntityPage<ConcernEntity>
      entityLabel="Dotyczy"
      addLabel="Nowy obszar"
      editLabel={(c) => `Edycja: ${c.name}`}
      description="Obszary i budżety, których mogą dotyczyć transakcje finansowe."
      fetchAll={fetchConcerns as () => Promise<ConcernEntity[]>}
      create={create}
      update={update}
      deactivate={deactivateConcern}
      deactivateConfirm={(c) => `Dezaktywować obszar „${c.name}"?`}
    />
  )
}
