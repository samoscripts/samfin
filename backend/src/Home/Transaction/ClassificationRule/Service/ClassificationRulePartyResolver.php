<?php

namespace App\Home\Transaction\ClassificationRule\Service;

use App\Home\Configuration\Entity\Party;
use App\Home\Transaction\Entity\Transaction;

class ClassificationRulePartyResolver
{
    /**
     * Returns the party whose rule set applies to this transaction (own side from CSV import).
     */
    public function resolve(Transaction $tx): ?Party
    {
        if ($tx->getDirection() === Transaction::DIRECTION_EXPENSE) {
            return $tx->getPaidFromParty();
        }

        return $tx->getPaidToParty();
    }
}
