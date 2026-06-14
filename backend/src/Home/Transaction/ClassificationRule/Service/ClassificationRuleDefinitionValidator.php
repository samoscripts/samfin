<?php

namespace App\Home\Transaction\ClassificationRule\Service;

use App\Home\Transaction\ClassificationRule\Mapper\ClassificationRuleJsonMapper;
use App\Home\Transaction\ClassificationRule\ValueObject\RuleActionsDefinition;
use App\Home\Transaction\ClassificationRule\ValueObject\RuleItemAction;

class ClassificationRuleDefinitionValidator
{
    public function __construct(
        private ClassificationRuleJsonMapper $mapper,
    ) {}

    /** @param array<string, mixed> $conditionsJson */
    public function validateConditions(array $conditionsJson): void
    {
        $this->mapper->mapConditions($conditionsJson);
    }

    /** @param array<string, mixed> $actionsJson */
    public function validateActions(array $actionsJson): RuleActionsDefinition
    {
        $actions = $this->mapper->mapActions($actionsJson);
        $this->validateSplits($actions);

        return $actions;
    }

    private function validateSplits(RuleActionsDefinition $actions): void
    {
        $itemCount = count($actions->items);
        if ($itemCount < 1) {
            throw new \InvalidArgumentException('Wymagana co najmniej 1 pozycja w akcjach.');
        }
        if ($itemCount > 2) {
            throw new \InvalidArgumentException('Maksymalnie 2 pozycje w akcjach reguły.');
        }

        $fullCount      = 0;
        $remainderCount = 0;
        $percentSum     = 0;
        $percentCount   = 0;

        foreach ($actions->items as $item) {
            match ($item->split->type) {
                'FULL'      => $fullCount++,
                'REMAINDER' => $remainderCount++,
                'PERCENT'   => (function () use ($item, &$percentSum, &$percentCount) {
                    $val = $item->split->value ?? 0;
                    if (!is_int($val) && !(is_float($val) && floor($val) == $val)) {
                        throw new \InvalidArgumentException('Procent musi być liczbą całkowitą.');
                    }
                    if ($val < 0) {
                        throw new \InvalidArgumentException('Procent nie może być ujemny.');
                    }
                    $percentSum   += (int) $val;
                    $percentCount++;
                })(),
                default     => throw new \InvalidArgumentException('Nieprawidłowy typ split.'),
            };
        }

        if ($fullCount > 1) {
            throw new \InvalidArgumentException('Dozwolona co najwyżej jedna pozycja FULL.');
        }
        if ($remainderCount > 1) {
            throw new \InvalidArgumentException('Dozwolona co najwyżej jedna pozycja REMAINDER.');
        }
        if ($fullCount === 1 && $itemCount > 1) {
            throw new \InvalidArgumentException('FULL nie może współistnieć z innymi splitami.');
        }
        if ($itemCount === 2 && $percentCount === 2 && $percentSum !== 100) {
            throw new \InvalidArgumentException('Suma procentów przy dwóch pozycjach musi wynosić 100.');
        }
        if ($percentSum > 100) {
            throw new \InvalidArgumentException('Suma procentów nie może przekraczać 100.');
        }
    }
}
