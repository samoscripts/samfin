<?php

namespace App\Home\Transaction\ClassificationRule\ValueObject;

final readonly class PreparedClassificationRules
{
    /** @param PreparedClassificationRuleEntry[] $entries */
    public function __construct(
        public array $entries,
    ) {
    }
}
