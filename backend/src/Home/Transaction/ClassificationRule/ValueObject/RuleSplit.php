<?php

namespace App\Home\Transaction\ClassificationRule\ValueObject;

final readonly class RuleSplit
{
    public function __construct(
        public string $type,
        public ?int   $value = null,
    ) {}
}
