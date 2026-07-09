<?php

namespace App\Home\Configuration\Rules\ValueObject;

final readonly class RuleCondition
{
    public function __construct(
        public string $field,
        public string $operator,
        public mixed  $value,
        public bool   $caseInsensitive = false,
    ) {}
}
