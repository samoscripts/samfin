<?php

namespace App\Home\Configuration\Rules\ValueObject;

final readonly class RuleActionsDefinition
{
    /** @param RuleItemAction[] $items */
    public function __construct(
        public RuleTransactionAction $transaction,
        public array                 $items,
    ) {}
}
