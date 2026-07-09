<?php

namespace App\Home\Configuration\Rules\ValueObject;

final readonly class PreparedClassificationRuleEntry
{
    public function __construct(
        public int $ruleId,
        public RuleConditionsDefinition $conditions,
        public bool $stopOnMatch,
    ) {
    }
}
