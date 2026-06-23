<?php

namespace App\Home\Configuration\Service;

use App\Home\Configuration\Entity\Category;
use App\Home\Configuration\Support\CategoryRuleReferenceSupport;
use App\Home\Transaction\ClassificationRule\Entity\ClassificationRule;
use App\Identity\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

class CategoryMergeService
{
    public function __construct(
        private EntityManagerInterface $em,
    ) {}

    /**
     * @return array{
     *     target: array<string, mixed>,
     *     deactivatedSourceId: int,
     *     affected: array{items: int, templates: int, rules: int}
     * }
     */
    public function mergeSubcategories(Category $source, Category $target, User $user): array
    {
        if ($source->getId() === $target->getId()) {
            throw new \InvalidArgumentException('Nie można scalić kategorii z samą sobą.');
        }

        if ($source->getParent() === null) {
            throw new \InvalidArgumentException('Scalanie dotyczy tylko subkategorii.');
        }

        if ($target->getParent() === null) {
            throw new \InvalidArgumentException('Cel scalenia musi być subkategorią.');
        }

        if (!$source->isActive() || !$target->isActive()) {
            throw new \InvalidArgumentException('Obie kategorie muszą być aktywne.');
        }

        if (!$target->supportsAllDirections($source->getDirections())) {
            throw new \InvalidArgumentException('Kategoria docelowa musi obsługiwać wszystkie kierunki kategorii źródłowej.');
        }

        $sourceId = $source->getId();
        $targetId = $target->getId();

        return $this->em->wrapInTransaction(function () use ($source, $target, $user, $sourceId, $targetId) {
            $conn = $this->em->getConnection();

            $itemsUpdated = $conn->executeStatement(
                'UPDATE transaction_items SET category_id = ? WHERE category_id = ?',
                [$targetId, $sourceId],
            );

            $templatesUpdated = $conn->executeStatement(
                'UPDATE transaction_template SET category_id = ? WHERE category_id = ?',
                [$targetId, $sourceId],
            );

            $rulesUpdated = $this->replaceCategoryInRules($sourceId, $targetId);

            $source->setActive(false);
            $source->setUpdatedBy($user);

            $this->em->flush();

            return [
                'target'              => $target->toApiArray(),
                'deactivatedSourceId' => $sourceId,
                'affected'            => [
                    'items'     => (int) $itemsUpdated,
                    'templates' => (int) $templatesUpdated,
                    'rules'     => $rulesUpdated,
                ],
            ];
        });
    }

    private function replaceCategoryInRules(int $sourceId, int $targetId): int
    {
        /** @var ClassificationRule[] $rules */
        $rules = $this->em->getRepository(ClassificationRule::class)->findAll();
        $updated = 0;

        foreach ($rules as $rule) {
            $updatedActions = CategoryRuleReferenceSupport::replaceCategoryInActions(
                $rule->getActionsJson(),
                $sourceId,
                $targetId,
            );

            if ($updatedActions !== null) {
                $rule->setActionsJson($updatedActions);
                ++$updated;
            }
        }

        return $updated;
    }
}
