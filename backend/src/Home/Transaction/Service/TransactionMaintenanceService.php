<?php

namespace App\Home\Transaction\Service;

use App\Home\Import\Entity\CsvImport;
use App\Home\Import\Entity\CsvImportRow;
use App\Home\Transaction\Entity\Transaction;
use App\Home\Transaction\Entity\TransactionChangeLog;
use App\Home\Transaction\Repository\TransactionChangeLogRepository;
use App\Home\Transaction\Repository\TransactionRepository;
use Doctrine\ORM\EntityManagerInterface;

class TransactionMaintenanceService
{
    private const EXPORT_BATCH_SIZE = 50;

    public function __construct(
        private EntityManagerInterface       $em,
        private TransactionRepository        $transactionRepository,
        private TransactionChangeLogRepository $changeLogRepository,
    ) {}

    public function countAll(): int
    {
        return $this->transactionRepository->countAll();
    }

    public function streamExportJson(): void
    {
        $count = $this->transactionRepository->countAll();
        $exportedAt = (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM);

        echo '{"exportedAt":' . json_encode($exportedAt, JSON_UNESCAPED_UNICODE);
        echo ',"transactionCount":' . $count;
        echo ',"transactions":[';

        $first = true;
        $offset = 0;

        while (true) {
            $batch = $this->transactionRepository->findBatchForExport($offset, self::EXPORT_BATCH_SIZE);
            if ($batch === []) {
                break;
            }

            $ids = array_map(fn(Transaction $t) => $t->getId(), $batch);
            $logsByTx = $this->changeLogRepository->findGroupedByTransactionIds($ids);

            foreach ($batch as $tx) {
                if (!$first) {
                    echo ',';
                }
                $first = false;

                $payload = $this->serializeForExport($tx, $logsByTx[$tx->getId()] ?? []);
                echo json_encode($payload, JSON_UNESCAPED_UNICODE);
            }

            $offset += self::EXPORT_BATCH_SIZE;
            $this->em->clear();
        }

        echo ']}';
    }

    /** @return array{deletedCount: int, importsReset: int} */
    public function clearAll(): array
    {
        return $this->em->wrapInTransaction(function () {
            $deletedCount = $this->transactionRepository->countAll();

            $this->em->createQuery('DELETE FROM App\Home\Transaction\Entity\Transaction t')->execute();

            $rowsReset = $this->em->createQuery(
                'UPDATE App\Home\Import\Entity\CsvImportRow r
                 SET r.parseStatus = :validated
                 WHERE r.parseStatus IN (:statuses)',
            )
                ->setParameter('validated', CsvImportRow::STATUS_VALIDATED)
                ->setParameter('statuses', [CsvImportRow::STATUS_IMPORTED, CsvImportRow::STATUS_DUPLICATE])
                ->execute();

            $importsReset = $this->em->createQuery(
                'UPDATE App\Home\Import\Entity\CsvImport i
                 SET i.status = :validated
                 WHERE i.status = :imported',
            )
                ->setParameter('validated', CsvImport::STATUS_VALIDATED)
                ->setParameter('imported', CsvImport::STATUS_IMPORTED)
                ->execute();

            return [
                'deletedCount'  => $deletedCount,
                'importsReset'  => (int) $rowsReset + (int) $importsReset,
            ];
        });
    }

    /**
     * @param TransactionChangeLog[] $changeLog
     * @return array<string, mixed>
     */
    private function serializeForExport(Transaction $tx, array $changeLog): array
    {
        $data = $tx->toApiArray();
        $data['id'] = $tx->getId();
        $data['importId'] = $tx->getImport()?->getId();
        $data['importRowId'] = $tx->getImportRow()?->getId();
        $data['createdAt'] = $tx->getCreatedAt()?->format(\DateTimeInterface::ATOM);
        $data['updatedAt'] = $tx->getUpdatedAt()?->format(\DateTimeInterface::ATOM);
        $data['changeLog'] = array_map(
            fn(TransactionChangeLog $e) => $e->toApiArray(),
            $changeLog,
        );

        return $data;
    }
}
