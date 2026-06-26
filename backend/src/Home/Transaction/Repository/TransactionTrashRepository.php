<?php

namespace App\Home\Transaction\Repository;

use App\Home\Transaction\Entity\TransactionTrash;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<TransactionTrash>
 */
class TransactionTrashRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, TransactionTrash::class);
    }
}
