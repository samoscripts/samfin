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
        $fullCount      = 0;
        $remainderCount = 0;
        $percentSum     = 0;

        foreach ($actions->items as $item) {
            match ($item->split->type) {
                'FULL'      => $fullCount++,
                'REMAINDER' => $remainderCount++,
                'PERCENT'   => $percentSum += $item->split->value ?? 0,
                default     => throw new \InvalidArgumentException('Nieprawidłowy typ split.'),
            };
        }

        if ($fullCount > 1) {
            throw new \InvalidArgumentException('Dozwolona co najwyżej jedna pozycja FULL.');
        }
        if ($remainderCount > 1) {
            throw new \InvalidArgumentException('Dozwolona co najwyżej jedna pozycja REMAINDER.');
        }
        if ($fullCount === 1 && count($actions->items) > 1) {
            throw new \InvalidArgumentException('FULL nie może współistnieć z innymi splitami.');
        }
        if ($percentSum > 100) {
            throw new \InvalidArgumentException('Suma procentów nie może przekraczać 100.');
        }
    }
}
