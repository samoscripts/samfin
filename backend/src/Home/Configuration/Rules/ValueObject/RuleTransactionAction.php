<?php

namespace App\Home\Configuration\Rules\ValueObject;

final readonly class RuleTransactionAction
{
    public function __construct(
        public ?int $paidFromPartyId,
        public ?int $paidToPartyId,
    ) {}
}
