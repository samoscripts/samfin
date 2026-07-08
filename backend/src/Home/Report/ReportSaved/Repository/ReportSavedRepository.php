<?php

namespace App\Home\Report\ReportSaved\Repository;

use App\Home\Report\ReportSaved\Entity\ReportSaved;
use App\Identity\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<ReportSaved> */
class ReportSavedRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ReportSaved::class);
    }

    /** @return ReportSaved[] */
    public function findByUserAndType(User $user, string $type): array
    {
        return $this->createQueryBuilder('r')
            ->andWhere('r.user = :user')
            ->andWhere('r.type = :type')
            ->setParameter('user', $user)
            ->setParameter('type', $type)
            ->orderBy('r.updatedAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    public function findOneByUserTypeAndName(User $user, string $type, string $name): ?ReportSaved
    {
        return $this->findOneBy([
            'user' => $user,
            'type' => $type,
            'name' => $name,
        ]);
    }
}
