<?php

namespace App\Home\Report\Repository;

use App\Home\Report\Entity\CommonAccountSettlementConfig;
use App\Identity\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class CommonAccountSettlementConfigRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, CommonAccountSettlementConfig::class);
    }

    public function findOrCreateForUser(User $user): CommonAccountSettlementConfig
    {
        $existing = $this->findOneBy(['user' => $user]);
        if ($existing !== null) {
            return $existing;
        }

        $config = new CommonAccountSettlementConfig();
        $config->setUser($user);
        $this->getEntityManager()->persist($config);
        $this->getEntityManager()->flush();

        return $config;
    }
}
