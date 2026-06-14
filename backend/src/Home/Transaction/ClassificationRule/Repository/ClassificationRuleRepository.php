<?php

namespace App\Home\Transaction\ClassificationRule\Repository;

use App\Home\Configuration\Entity\Party;
use App\Home\Transaction\ClassificationRule\Entity\ClassificationRule;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class ClassificationRuleRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ClassificationRule::class);
    }

    /** @return ClassificationRule[] */
    public function findActiveByPartyOrdered(Party $party): array
    {
        return $this->createQueryBuilder('r')
            ->where('r.party = :party')
            ->andWhere('r.active = true')
            ->andWhere('r.enabled = true')
            ->setParameter('party', $party)
            ->orderBy('r.priority', 'ASC')
            ->addOrderBy('r.id', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /** @return ClassificationRule[] */
    public function findAllByParty(Party $party): array
    {
        return $this->createQueryBuilder('r')
            ->where('r.party = :party')
            ->andWhere('r.active = true')
            ->setParameter('party', $party)
            ->orderBy('r.priority', 'ASC')
            ->addOrderBy('r.id', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /** @return ClassificationRule[] */
    public function findAllActive(): array
    {
        return $this->createQueryBuilder('r')
            ->innerJoin('r.party', 'p')
            ->addSelect('p')
            ->where('r.active = true')
            ->orderBy('p.name', 'ASC')
            ->addOrderBy('r.priority', 'ASC')
            ->addOrderBy('r.id', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
