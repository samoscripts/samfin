<?php

namespace App\Home\Transaction\ClassificationRule\ValueObject;

final readonly class RuleConditionsDefinition
{
    /** @param RuleCondition[] $conditions */
    public function __construct(
        public array $conditions,
    ) {}
}
