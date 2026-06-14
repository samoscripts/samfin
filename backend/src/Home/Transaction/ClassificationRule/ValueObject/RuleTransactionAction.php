<?php

namespace App\Home\Transaction\ClassificationRule\ValueObject;

final readonly class RuleTransactionAction
{
    public function __construct(
        public ?int $paidFromPartyId,
        public ?int $paidToPartyId,
    ) {}
}
