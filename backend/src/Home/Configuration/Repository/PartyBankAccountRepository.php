<?php

namespace App\Home\Configuration\Repository;

use App\Home\Configuration\Entity\PartyBankAccount;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<PartyBankAccount> */
class PartyBankAccountRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, PartyBankAccount::class);
    }
}
