<?php

namespace App\Home\Configuration\Service;

use App\Home\Configuration\Support\CategoryRuleReferenceSupport;
use App\Home\Transaction\ClassificationRule\Entity\ClassificationRule;
use Doctrine\ORM\EntityManagerInterface;

class CategoryUsageService
{
    public function __construct(
        private EntityManagerInterface $em,
    ) {}

    /**
     * Counts live references to a category in the same places handled by CategoryMergeService.
     *
     * @return array{items: int, templates: int, rules: int, total: int}
     */
    public function countUsages(int $categoryId): array
    {
        $conn = $this->em->getConnection();

        $items = (int) $conn->fetchOne(
            'SELECT COUNT(*) FROM transaction_items WHERE category_id = ?',
            [$categoryId],
        );

        $templates = (int) $conn->fetchOne(
            'SELECT COUNT(*) FROM transaction_template WHERE category_id = ?',
            [$categoryId],
        );

        $rules = $this->countRulesReferencingCategory($categoryId);

        return [
            'items'     => $items,
            'templates' => $templates,
            'rules'     => $rules,
            'total'     => $items + $templates + $rules,
        ];
    }

    public function hasUsages(int $categoryId): bool
    {
        return $this->countUsages($categoryId)['total'] > 0;
    }

    private function countRulesReferencingCategory(int $categoryId): int
    {
        /** @var ClassificationRule[] $rules */
        $rules = $this->em->getRepository(ClassificationRule::class)->findAll();
        $count = 0;

        foreach ($rules as $rule) {
            if (CategoryRuleReferenceSupport::actionsReferenceCategoryId($rule->getActionsJson(), $categoryId)) {
                ++$count;
            }
        }

        return $count;
    }
}
