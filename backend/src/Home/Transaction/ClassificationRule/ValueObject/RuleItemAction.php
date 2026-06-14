<?php

namespace App\Home\Transaction\ClassificationRule\ValueObject;

final readonly class RuleItemAction
{
    public function __construct(
        public RuleSplit $split,
        public ?int      $walletId,
        public ?int      $concernId,
        public ?int      $categoryId,
        public ?string   $description = null,
    ) {}
}
