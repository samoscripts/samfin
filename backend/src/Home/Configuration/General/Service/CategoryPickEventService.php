<?php

namespace App\Home\Configuration\General\Service;

use App\Home\Configuration\General\Entity\Category;
use App\Home\Configuration\General\Entity\UserCategoryPickEvent;
use App\Home\Configuration\General\Repository\CategoryRepository;
use App\Home\Configuration\General\Repository\UserCategoryPickEventRepository;
use App\Home\Transaction\Entity\Transaction;
use App\Identity\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

class CategoryPickEventService
{
    public const WINDOW_DAYS = 90;
    public const MAX_FREQUENT_LIMIT = 20;

    public function __construct(
        private EntityManagerInterface $em,
        private UserCategoryPickEventRepository $repository,
        private CategoryRepository $categoryRepository,
    ) {}

    public function recordPick(User $user, Category $category, string $direction): void
    {
        if ($category->getParent() === null) {
            throw new \InvalidArgumentException('Można rejestrować tylko wybór subkategorii.');
        }

        if (!$category->isActive()) {
            throw new \InvalidArgumentException('Kategoria musi być aktywna.');
        }

        if (!in_array($direction, [Transaction::DIRECTION_EXPENSE, Transaction::DIRECTION_INCOME], true)) {
            throw new \InvalidArgumentException('Nieprawidłowy kierunek.');
        }

        $event = new UserCategoryPickEvent();
        $event->setUser($user);
        $event->setCategory($category);
        $event->setDirection($direction);

        $this->em->persist($event);
        $this->em->flush();
    }

    /**
     * @return list<array{categoryId: int, pickCount: int, lastUsedAt: string}>
     */
    public function findFrequent(User $user, string $direction, int $limit): array
    {
        $limit = max(1, min($limit, self::MAX_FREQUENT_LIMIT));
        $since = new \DateTimeImmutable(sprintf('-%d days', self::WINDOW_DAYS));

        return $this->repository->findFrequentForUser($user, $direction, $since, $limit);
    }

    public function purgeExpired(): int
    {
        $cutoff = new \DateTimeImmutable(sprintf('-%d days', self::WINDOW_DAYS));

        return $this->repository->purgeOlderThan($cutoff);
    }

    public function resolveCategory(int $categoryId): ?Category
    {
        return $this->categoryRepository->find($categoryId);
    }
}
