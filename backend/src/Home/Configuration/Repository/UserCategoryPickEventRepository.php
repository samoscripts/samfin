<?php

namespace App\Home\Configuration\Repository;

use App\Home\Configuration\Entity\UserCategoryPickEvent;
use App\Identity\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<UserCategoryPickEvent>
 */
class UserCategoryPickEventRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, UserCategoryPickEvent::class);
    }

    /**
     * @return list<array{categoryId: int, pickCount: int, lastUsedAt: string}>
     */
    public function findFrequentForUser(User $user, string $direction, \DateTimeImmutable $since, int $limit): array
    {
        $conn = $this->getEntityManager()->getConnection();

        $limit = max(1, min($limit, 20));

        $rows = $conn->fetchAllAssociative(
            sprintf(
                'SELECT e.category_id AS categoryId,
                        COUNT(*) AS pickCount,
                        MAX(e.created_at) AS lastUsedAt
                 FROM user_category_pick_event e
                 INNER JOIN category c ON c.id = e.category_id AND c.active = 1 AND c.parent_id IS NOT NULL
                 WHERE e.user_id = :userId
                   AND e.direction = :direction
                   AND e.created_at >= :since
                 GROUP BY e.category_id
                 ORDER BY pickCount DESC, lastUsedAt DESC
                 LIMIT %d',
                $limit,
            ),
            [
                'userId'    => $user->getId(),
                'direction' => $direction,
                'since'     => $since->format('Y-m-d H:i:s'),
            ],
        );

        return array_map(static function (array $row): array {
            $lastUsedAt = $row['lastUsedAt'];
            if ($lastUsedAt instanceof \DateTimeInterface) {
                $lastUsedAt = $lastUsedAt->format('Y-m-d\TH:i:s\Z');
            } elseif (is_string($lastUsedAt)) {
                $lastUsedAt = (new \DateTimeImmutable($lastUsedAt))->format('Y-m-d\TH:i:s\Z');
            }

            return [
                'categoryId'  => (int) $row['categoryId'],
                'pickCount'   => (int) $row['pickCount'],
                'lastUsedAt'  => $lastUsedAt,
            ];
        }, $rows);
    }

    public function purgeOlderThan(\DateTimeImmutable $cutoff): int
    {
        return $this->getEntityManager()->getConnection()->executeStatement(
            'DELETE FROM user_category_pick_event WHERE created_at < :cutoff',
            ['cutoff' => $cutoff->format('Y-m-d H:i:s')],
        );
    }

    public function reassignCategory(int $sourceCategoryId, int $targetCategoryId): int
    {
        return $this->getEntityManager()->getConnection()->executeStatement(
            'UPDATE user_category_pick_event SET category_id = :targetId WHERE category_id = :sourceId',
            ['targetId' => $targetCategoryId, 'sourceId' => $sourceCategoryId],
        );
    }
}
