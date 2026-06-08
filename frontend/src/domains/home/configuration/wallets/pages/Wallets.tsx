import SimpleEntityPage, { type SimpleEntity } from '../../shared/SimpleEntityPage'
import {
  fetchWallets,
  createWallet,
  updateWallet,
  deactivateWallet,
  type Wallet,
} from '@/shared/api/wallets'

type WalletEntity = Wallet & SimpleEntity

const create = (p: Record<string, unknown>) =>
  createWallet(p as Parameters<typeof createWallet>[0]) as Promise<WalletEntity>

const update = (id: number, p: Record<string, unknown>) =>
  updateWallet(id, p as Parameters<typeof updateWallet>[1]) as Promise<WalletEntity>

export default function Wallets() {
  return (
    <SimpleEntityPage<WalletEntity>
      entityLabel="Portfele"
      addLabel="Nowy portfel"
      editLabel={(w) => `Edycja: ${w.name}`}
      description="Konta i portfele, z których fizycznie wychodzą lub na które wpływają środki."
      fetchAll={fetchWallets as () => Promise<WalletEntity[]>}
      create={create}
      update={update}
      deactivate={deactivateWallet}
      deactivateConfirm={(w) => `Dezaktywować portfel „${w.name}"?`}
    />
  )
}
