<?php

namespace App\Identity\Repository;

use App\Identity\Entity\User;
use App\Identity\Entity\UserApiToken;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<UserApiToken>
 */
class UserApiTokenRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, UserApiToken::class);
    }

    public function findOneByToken(string $token): ?UserApiToken
    {
        return $this->findOneBy(['token' => $token]);
    }

    public function deleteAllForUser(User $user): int
    {
        return $this->createQueryBuilder('t')
            ->delete()
            ->where('t.user = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->execute();
    }
}
