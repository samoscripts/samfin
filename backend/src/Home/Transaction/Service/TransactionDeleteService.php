<?php

namespace App\Home\Transaction\Service;

use App\Home\Report\Settlement\Service\SettlementIndexStateService;
use App\Home\Transaction\Entity\Transaction;
use App\Home\Transaction\Entity\TransactionChangeLog;
use App\Home\Transaction\Entity\TransactionTrash;
use App\Home\Transaction\Repository\TransactionChangeLogRepository;
use App\Home\Transaction\Repository\TransactionRepository;
use App\Identity\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

class TransactionDeleteService
{
    public function __construct(
        private EntityManagerInterface $em,
        private TransactionRepository $transactionRepository,
        private TransactionChangeLogRepository $changeLogRepository,
        private SettlementIndexStateService $settlementIndexStateService,
    ) {}

    public function deleteById(int $id, User $user): bool
    {
        $tx = $this->transactionRepository->find($id);
        if ($tx === null) {
            return false;
        }

        $this->delete($tx, $user);

        return true;
    }

    public function delete(Transaction $transaction, User $user, bool $markSettlementDirty = true): void
    {
        $txId = $transaction->getId();
        if ($txId === null) {
            return;
        }

        $changeLogs = $this->changeLogRepository->findGroupedByTransactionIds([$txId]);
        /** @var TransactionChangeLog[] $entries */
        $entries = $changeLogs[$txId] ?? [];

        $snapshot = $transaction->toApiArray();
        $snapshot['importId']    = $transaction->getImport()?->getId();
        $snapshot['importRowId'] = $transaction->getImportRow()?->getId();
        $snapshot['changeLog']   = array_map(
            static fn (TransactionChangeLog $entry) => $entry->toApiArray(),
            $entries,
        );

        $trash = new TransactionTrash();
        $trash->setOriginalTransactionId($txId);
        $trash->setSnapshotJson($snapshot);
        $trash->setDeletedAt(new \DateTimeImmutable());
        $trash->setDeletedBy($user);

        $this->em->persist($trash);
        $this->em->remove($transaction);
        $this->em->flush();

        if ($markSettlementDirty) {
            $this->settlementIndexStateService->markDirty($user);
        }
    }
}
