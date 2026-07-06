<?php

namespace App\Home\Report\Settlement\Repository;

use App\Home\Report\Settlement\Entity\SettlementPeriod;
use App\Identity\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class SettlementPeriodRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, SettlementPeriod::class);
    }

    public function findByUserAndYear(User $user, int $year): ?SettlementPeriod
    {
        return $this->findOneBy(['user' => $user, 'year' => $year]);
    }

    /**
     * @return SettlementPeriod[]
     */
    public function findAllForUserOrdered(User $user): array
    {
        return $this->createQueryBuilder('p')
            ->where('p.user = :user')
            ->setParameter('user', $user)
            ->orderBy('p.year', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * @return SettlementPeriod[]
     */
    public function findOpenPeriodsEndedBefore(User $user, \DateTimeImmutable $today): array
    {
        return $this->createQueryBuilder('p')
            ->where('p.user = :user')
            ->andWhere('p.status = :status')
            ->andWhere('p.dateTo < :today')
            ->setParameter('user', $user)
            ->setParameter('status', SettlementPeriod::STATUS_OPEN)
            ->setParameter('today', $today->format('Y-m-d'))
            ->orderBy('p.year', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
