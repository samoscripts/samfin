<?php

namespace App\Home\Configuration\Support;

/**
 * Shared helpers for categoryId references inside classification_rule.actions_json.
 */
final class CategoryRuleReferenceSupport
{
    /**
     * @param array<string, mixed> $actions
     */
    public static function actionsReferenceCategoryId(array $actions, int $categoryId): bool
    {
        if (!isset($actions['items']) || !is_array($actions['items'])) {
            return false;
        }

        foreach ($actions['items'] as $item) {
            if (!is_array($item)) {
                continue;
            }
            if (isset($item['categoryId']) && (int) $item['categoryId'] === $categoryId) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param array<string, mixed> $actions
     * @return array<string, mixed>|null Updated actions when changed, null when unchanged.
     */
    public static function replaceCategoryInActions(array $actions, int $sourceId, int $targetId): ?array
    {
        if (!isset($actions['items']) || !is_array($actions['items'])) {
            return null;
        }

        $changed = false;

        foreach ($actions['items'] as $i => $item) {
            if (!is_array($item)) {
                continue;
            }
            if (isset($item['categoryId']) && (int) $item['categoryId'] === $sourceId) {
                $actions['items'][$i]['categoryId'] = $targetId;
                $changed = true;
            }
        }

        return $changed ? $actions : null;
    }
}
