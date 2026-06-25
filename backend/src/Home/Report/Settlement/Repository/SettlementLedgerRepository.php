<?php

namespace App\Home\Report\Settlement\Repository;

use App\Home\Report\Settlement\Entity\SettlementLedgerEntry;
use App\Identity\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class SettlementLedgerRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, SettlementLedgerEntry::class);
    }

    public function deleteFromDate(User $user, string $dateFrom): int
    {
        return $this->createQueryBuilder('e')
            ->delete()
            ->where('e.user = :user')
            ->andWhere('e.operationDate >= :dateFrom')
            ->setParameter('user', $user)
            ->setParameter('dateFrom', $dateFrom)
            ->getQuery()
            ->execute();
    }

    public function findLastAtOrBefore(User $user, string $dateTo): ?SettlementLedgerEntry
    {
        return $this->createQueryBuilder('e')
            ->where('e.user = :user')
            ->andWhere('e.operationDate <= :dateTo')
            ->setParameter('user', $user)
            ->setParameter('dateTo', $dateTo)
            ->orderBy('e.ledgerSequence', 'DESC')
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * @return SettlementLedgerEntry[]
     */
    public function findInRange(User $user, string $dateFrom, string $dateTo): array
    {
        return $this->createQueryBuilder('e')
            ->where('e.user = :user')
            ->andWhere('e.operationDate >= :dateFrom')
            ->andWhere('e.operationDate <= :dateTo')
            ->setParameter('user', $user)
            ->setParameter('dateFrom', $dateFrom)
            ->setParameter('dateTo', $dateTo)
            ->orderBy('e.ledgerSequence', 'ASC')
            ->getQuery()
            ->getResult();
    }

    public function findLastBeforeDate(User $user, string $date): ?SettlementLedgerEntry
    {
        return $this->createQueryBuilder('e')
            ->where('e.user = :user')
            ->andWhere('e.operationDate < :date')
            ->setParameter('user', $user)
            ->setParameter('date', $date)
            ->orderBy('e.ledgerSequence', 'DESC')
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }
}
