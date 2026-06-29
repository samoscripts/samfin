<?php

namespace App\Home\Transaction\ClassificationRule\Service;

use App\Home\Transaction\Entity\Transaction;

class ClassificationRuleConditionsNormalizer
{
    public const FIELD_DIRECTION = 'direction';

    private const FIELD_AMOUNT_MINOR = 'amount_minor';

    /**
     * @param array<string, mixed> $conditionsJson
     * @return array<string, mixed>
     */
    public function normalize(array $conditionsJson, ?string $fallbackDirection = null): array
    {
        $list = $conditionsJson['conditions'] ?? [];
        if (!is_array($list)) {
            $list = [];
        }

        $direction = $this->extractDirectionFromList($list) ?? $fallbackDirection;
        $rest      = $this->stripDirectionFromList($list);

        if ($direction === null || !$this->isValidDirection($direction)) {
            throw new \InvalidArgumentException(
                'Warunek kierunku (direction) jest wymagany i musi być EXPENSE lub INCOME.',
            );
        }

        return [
            'conditions' => [
                $this->directionCondition($direction),
                ...array_map(fn (array $item) => $this->normalizeAmountCondition($item), $rest),
            ],
        ];
    }

    /**
     * @param array<string, mixed> $conditionsJson
     */
    public function extractDirection(array $conditionsJson): ?string
    {
        $list = $conditionsJson['conditions'] ?? [];

        return is_array($list) ? $this->extractDirectionFromList($list) : null;
    }

    /**
     * @param array<string, mixed> $conditionsJson
     */
    public function validateRequiredDirection(array $conditionsJson): void
    {
        $this->normalize($conditionsJson, $this->extractDirection($conditionsJson));
    }

    /**
     * @param array<string, mixed> $actionsJson
     */
    public function inferDirectionFromActions(int $partyId, array $actionsJson): string
    {
        $tx = $actionsJson['transaction'] ?? [];
        if (!is_array($tx)) {
            return Transaction::DIRECTION_EXPENSE;
        }

        $paidTo   = isset($tx['paidToPartyId']) ? (int) $tx['paidToPartyId'] : null;
        $paidFrom = isset($tx['paidFromPartyId']) ? (int) $tx['paidFromPartyId'] : null;

        if ($paidTo === $partyId) {
            return Transaction::DIRECTION_INCOME;
        }

        if ($paidFrom === $partyId) {
            return Transaction::DIRECTION_EXPENSE;
        }

        return Transaction::DIRECTION_EXPENSE;
    }

    /** @return array{field: string, operator: string, value: string} */
    public function directionCondition(string $direction): array
    {
        return [
            'field'    => self::FIELD_DIRECTION,
            'operator' => 'equals',
            'value'    => $direction,
        ];
    }

    /**
     * @param array<int, mixed> $list
     * @return array<int, array<string, mixed>>
     */
    private function stripDirectionFromList(array $list): array
    {
        $rest = [];
        foreach ($list as $item) {
            if (!is_array($item)) {
                continue;
            }
            if (($item['field'] ?? '') === self::FIELD_DIRECTION) {
                continue;
            }
            $rest[] = $item;
        }

        return $rest;
    }

    /**
     * @param array<int, mixed> $list
     */
    private function extractDirectionFromList(array $list): ?string
    {
        foreach ($list as $item) {
            if (!is_array($item)) {
                continue;
            }
            if (($item['field'] ?? '') !== self::FIELD_DIRECTION) {
                continue;
            }
            if (($item['operator'] ?? '') !== 'equals') {
                continue;
            }
            $value = $item['value'] ?? null;
            if (is_string($value) && $this->isValidDirection($value)) {
                return $value;
            }
        }

        return null;
    }

    private function isValidDirection(string $direction): bool
    {
        return in_array($direction, [Transaction::DIRECTION_EXPENSE, Transaction::DIRECTION_INCOME], true);
    }

    /**
     * @param array<string, mixed> $item
     * @return array<string, mixed>
     */
    private function normalizeAmountCondition(array $item): array
    {
        if (($item['field'] ?? '') !== self::FIELD_AMOUNT_MINOR) {
            return $item;
        }

        $operator = $item['operator'] ?? '';
        $value    = $item['value'] ?? null;

        if (in_array($operator, ['is_empty', 'is_not_empty'], true)) {
            return $item;
        }

        if ($operator === 'between' && is_array($value) && count($value) === 2) {
            $item['value'] = [abs((int) $value[0]), abs((int) $value[1])];

            return $item;
        }

        if (in_array($operator, ['in', 'not_in'], true) && is_array($value)) {
            $item['value'] = array_map(static fn (mixed $v) => abs((int) $v), $value);

            return $item;
        }

        if ($value !== null && $value !== '') {
            $item['value'] = abs((int) $value);
        }

        return $item;
    }
}
