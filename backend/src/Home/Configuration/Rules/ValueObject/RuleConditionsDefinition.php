<?php

namespace App\Home\Configuration\Rules\ValueObject;

final readonly class RuleConditionsDefinition
{
    /** @param RuleCondition[] $conditions */
    public function __construct(
        public array $conditions,
    ) {}
}
