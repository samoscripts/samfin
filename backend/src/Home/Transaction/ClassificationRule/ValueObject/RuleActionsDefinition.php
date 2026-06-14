<?php

namespace App\Home\Transaction\ClassificationRule\ValueObject;

final readonly class RuleActionsDefinition
{
    /** @param RuleItemAction[] $items */
    public function __construct(
        public RuleTransactionAction $transaction,
        public array                 $items,
    ) {}
}
