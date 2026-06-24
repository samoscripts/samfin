<?php

namespace App\Home\Report\Settlement\Repository;

use App\Home\Report\Settlement\Entity\SettlementConfig;
use App\Identity\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class SettlementConfigRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, SettlementConfig::class);
    }

    public function findOrCreateForUser(User $user): SettlementConfig
    {
        $existing = $this->findOneBy(['user' => $user]);
        if ($existing !== null) {
            return $existing;
        }

        $config = new SettlementConfig();
        $config->setUser($user);
        $this->getEntityManager()->persist($config);
        $this->getEntityManager()->flush();

        return $config;
    }
}
