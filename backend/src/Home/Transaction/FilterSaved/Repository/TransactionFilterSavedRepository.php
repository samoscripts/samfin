<?php

namespace App\Home\Transaction\FilterSaved\Repository;

use App\Home\Transaction\FilterSaved\Entity\TransactionFilterSaved;
use App\Identity\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<TransactionFilterSaved> */
class TransactionFilterSavedRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, TransactionFilterSaved::class);
    }

    /** @return TransactionFilterSaved[] */
    public function findByUser(User $user): array
    {
        return $this->createQueryBuilder('f')
            ->andWhere('f.user = :user')
            ->setParameter('user', $user)
            ->orderBy('f.updatedAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    public function findOneByUserAndName(User $user, string $name): ?TransactionFilterSaved
    {
        return $this->findOneBy([
            'user' => $user,
            'name' => $name,
        ]);
    }
}
