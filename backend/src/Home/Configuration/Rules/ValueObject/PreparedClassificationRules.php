<?php

namespace App\Home\Configuration\Rules\ValueObject;

final readonly class PreparedClassificationRules
{
    /** @param PreparedClassificationRuleEntry[] $entries */
    public function __construct(
        public array $entries,
    ) {
    }
}
