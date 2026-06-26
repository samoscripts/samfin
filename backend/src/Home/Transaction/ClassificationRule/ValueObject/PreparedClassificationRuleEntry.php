<?php

namespace App\Home\Transaction\ClassificationRule\ValueObject;

final readonly class PreparedClassificationRuleEntry
{
    public function __construct(
        public int $ruleId,
        public RuleConditionsDefinition $conditions,
        public bool $stopOnMatch,
    ) {
    }
}
