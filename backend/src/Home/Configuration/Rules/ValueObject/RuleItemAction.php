<?php

namespace App\Home\Configuration\Rules\ValueObject;

final readonly class RuleItemAction
{
    public function __construct(
        public int     $percent,
        public ?int    $walletId,
        public ?int    $concernId,
        public ?int    $categoryId,
        public ?string $description = null,
    ) {}
}
