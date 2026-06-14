<?php

namespace App\Home\Transaction\Service;

use App\Home\Transaction\Entity\Transaction;
use App\Home\Transaction\Entity\TransactionItem;

class TransactionStatusCalculator
{
    public function calculate(Transaction $tx): string
    {
        $hasPaidFrom = $tx->getPaidFromParty() !== null;
        $hasPaidTo   = $tx->getPaidToParty() !== null;

        $items = $tx->getItems()->toArray();
        $anyItemDimension = false;
        $allItemsComplete = !empty($items);

        foreach ($items as $item) {
            /** @var TransactionItem $item */
            $hasWallet   = $item->getWallet() !== null;
            $hasConcern  = $item->getConcern() !== null;
            $hasCategory = $item->getCategory() !== null;

            if ($hasWallet || $hasConcern || $hasCategory) {
                $anyItemDimension = true;
            }

            if (!($hasWallet && $hasConcern && $hasCategory)) {
                $allItemsComplete = false;
            }
        }

        $anyFilled = $hasPaidFrom || $hasPaidTo || $anyItemDimension;

        $isClassified = $hasPaidFrom
            && $hasPaidTo
            && $allItemsComplete
            && !empty($items);

        if ($isClassified) {
            return Transaction::STATUS_CLASSIFIED;
        }

        if ($anyFilled) {
            return Transaction::STATUS_PARTIALLY_CLASSIFIED;
        }

        return Transaction::STATUS_UNCLASSIFIED;
    }
}
