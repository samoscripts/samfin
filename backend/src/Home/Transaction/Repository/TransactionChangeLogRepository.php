<?php

namespace App\Home\Transaction\Repository;

use App\Home\Transaction\Entity\Transaction;
use App\Home\Transaction\Entity\TransactionChangeLog;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<TransactionChangeLog>
 */
class TransactionChangeLogRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, TransactionChangeLog::class);
    }

    /**
     * @return array{items: TransactionChangeLog[], total: int}
     */
    public function findPagedForTransaction(Transaction $tx, int $page, int $perPage): array
    {
        $qb = $this->createQueryBuilder('l')
            ->andWhere('l.transaction = :tx')
            ->setParameter('tx', $tx)
            ->orderBy('l.id', 'DESC');

        $countQb = clone $qb;
        $total = (int) $countQb->select('COUNT(l.id)')->getQuery()->getSingleScalarResult();

        $items = $qb
            ->setFirstResult(($page - 1) * $perPage)
            ->setMaxResults($perPage)
            ->getQuery()
            ->getResult();

        return ['items' => $items, 'total' => $total];
    }

    public function findForTransaction(Transaction $tx, int $changeId): ?TransactionChangeLog
    {
        return $this->findOneBy([
            'id'          => $changeId,
            'transaction' => $tx,
        ]);
    }

    /**
     * @param int[] $transactionIds
     * @return array<int, TransactionChangeLog[]>
     */
    public function findGroupedByTransactionIds(array $transactionIds): array
    {
        if ($transactionIds === []) {
            return [];
        }

        $entries = $this->createQueryBuilder('l')
            ->addSelect('u')
            ->join('l.transaction', 't')
            ->join('l.createdBy', 'u')
            ->where('t.id IN (:ids)')
            ->setParameter('ids', $transactionIds)
            ->orderBy('l.id', 'ASC')
            ->getQuery()
            ->getResult();

        $grouped = [];
        foreach ($entries as $entry) {
            /** @var TransactionChangeLog $entry */
            $txId = $entry->getTransaction()?->getId();
            if ($txId === null) {
                continue;
            }
            $grouped[$txId][] = $entry;
        }

        return $grouped;
    }
}
