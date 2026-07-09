<?php

namespace App\Home\Configuration\General\Repository;

use App\Home\Configuration\General\Entity\Party;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<Party> */
class PartyRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Party::class);
    }

    /**
     * OWN parties with at least one active bank account and at least one CSV import.
     *
     * @return Party[]
     */
    public function findEligibleForClassificationRules(): array
    {
        return $this->createQueryBuilder('p')
            ->where('p.active = true')
            ->andWhere('p.ownershipType = :own')
            ->andWhere('EXISTS (
                SELECT 1 FROM App\Home\Configuration\General\Entity\PartyBankAccount ba
                WHERE ba.party = p AND ba.active = true
            )')
            ->andWhere('EXISTS (
                SELECT 1 FROM App\Home\Import\Entity\CsvImport i
                WHERE i.party = p
            )')
            ->setParameter('own', Party::OWNERSHIP_OWN)
            ->orderBy('p.name', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
