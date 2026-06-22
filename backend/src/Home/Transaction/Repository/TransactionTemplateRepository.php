<?php

namespace App\Home\Transaction\Repository;

use App\Home\Transaction\Entity\TransactionTemplate;
use App\Identity\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<TransactionTemplate> */
class TransactionTemplateRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, TransactionTemplate::class);
    }

    /** @return TransactionTemplate[] */
    public function findByUserAndDirection(User $user, string $direction): array
    {
        return $this->createQueryBuilder('t')
            ->where('t.user = :user')
            ->andWhere('t.direction = :direction')
            ->setParameter('user', $user)
            ->setParameter('direction', $direction)
            ->orderBy('t.name', 'ASC')
            ->getQuery()
            ->getResult();
    }

    public function findOneByUserDirectionAndName(User $user, string $direction, string $name): ?TransactionTemplate
    {
        return $this->findOneBy([
            'user'      => $user,
            'direction' => $direction,
            'name'      => $name,
        ]);
    }
}
