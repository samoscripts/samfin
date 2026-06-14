<?php

namespace App\Home\Transaction\Service;

use App\Home\Configuration\Entity\Party;
use App\Home\Transaction\Entity\Transaction;

/**
 * Validates Skąd (paid_from) and Dokąd (paid_to) assignments using contextual business rules
 * (transaction source, direction, party type/ownership) instead of per-party direction flags.
 */
class TransactionPartyAssignmentValidator
{
    public const FIELD_PAID_FROM = 'paidFrom';
    public const FIELD_PAID_TO   = 'paidTo';

    /**
     * Validates a complete Skąd/Dokąd pair before persisting classification or bulk update.
     *
     * Runs, in order: import lock check, manual own-side rules, distinct parties, active status.
     *
     * @throws \InvalidArgumentException when any rule is violated
     */
    public function assertAssignment(
        Transaction $tx,
        ?Party       $paidFrom,
        ?Party       $paidTo,
    ): void {
        $this->assertImportOwnSideNotModified($tx, $paidFrom, $paidTo);
        $this->assertManualOwnSideRules($tx, $paidFrom, $paidTo);
        $this->assertDistinctParties($paidFrom, $paidTo);
        $this->assertPartiesActive($paidFrom, $paidTo);
    }

    /**
     * Returns true when the given field must not be edited (set at import, read-only in UI).
     *
     * CSV + EXPENSE → Skąd locked; CSV + INCOME → Dokąd locked.
     */
    public function isOwnSideLocked(Transaction $tx, string $field): bool
    {
        if ($tx->getSource() !== Transaction::SOURCE_CSV) {
            return false;
        }

        return match ($field) {
            self::FIELD_PAID_FROM => $tx->getDirection() === Transaction::DIRECTION_EXPENSE,
            self::FIELD_PAID_TO   => $tx->getDirection() === Transaction::DIRECTION_INCOME,
            default               => false,
        };
    }

    /**
     * Blocks changing the import-derived own-side party on CSV transactions.
     *
     * Compares new assignment IDs with the values already stored on the transaction entity.
     */
    public function assertImportOwnSideNotModified(
        Transaction $tx,
        ?Party       $paidFrom,
        ?Party       $paidTo,
    ): void {
        if ($tx->getSource() !== Transaction::SOURCE_CSV) {
            return;
        }

        if ($tx->getDirection() === Transaction::DIRECTION_EXPENSE) {
            $currentId = $tx->getPaidFromParty()?->getId();
            $newId     = $paidFrom?->getId();
            if ($currentId !== $newId) {
                throw new \InvalidArgumentException(
                    'Nie można zmienić Skąd dla transakcji zaimportowanej z wyciągu bankowego (wydatek).',
                );
            }
        }

        if ($tx->getDirection() === Transaction::DIRECTION_INCOME) {
            $currentId = $tx->getPaidToParty()?->getId();
            $newId     = $paidTo?->getId();
            if ($currentId !== $newId) {
                throw new \InvalidArgumentException(
                    'Nie można zmienić Dokąd dla transakcji zaimportowanej z wyciągu bankowego (wpływ).',
                );
            }
        }
    }

    /**
     * Ensures manual transactions use OWN + CASH on the own side only.
     *
     * MANUAL + EXPENSE → Skąd must be OWN+CASH; MANUAL + INCOME → Dokąd must be OWN+CASH.
     * Null is allowed (partial classification).
     */
    public function assertManualOwnSideRules(
        Transaction $tx,
        ?Party       $paidFrom,
        ?Party       $paidTo,
    ): void {
        if ($tx->getSource() !== Transaction::SOURCE_MANUAL) {
            return;
        }

        if ($tx->getDirection() === Transaction::DIRECTION_EXPENSE && $paidFrom !== null) {
            $this->assertOwnCashParty($paidFrom, 'Skąd');
        }

        if ($tx->getDirection() === Transaction::DIRECTION_INCOME && $paidTo !== null) {
            $this->assertOwnCashParty($paidTo, 'Dokąd');
        }
    }

    /**
     * Requires Skąd and Dokąd to refer to different parties when both are set.
     */
    public function assertDistinctParties(?Party $paidFrom, ?Party $paidTo): void
    {
        if ($paidFrom === null || $paidTo === null) {
            return;
        }

        if ($paidFrom->getId() === $paidTo->getId()) {
            throw new \InvalidArgumentException(
                'Skąd i Dokąd muszą wskazywać różne podmioty.',
            );
        }
    }

    /**
     * Rejects inactive parties on either side.
     */
    private function assertPartiesActive(?Party $paidFrom, ?Party $paidTo): void
    {
        foreach ([$paidFrom, $paidTo] as $party) {
            if ($party !== null && !$party->isActive()) {
                throw new \InvalidArgumentException(sprintf(
                    'Podmiot „%s” jest nieaktywny.',
                    $party->getName(),
                ));
            }
        }
    }

    /**
     * Validates that a party is the user's own cash (manual own-side rule).
     */
    private function assertOwnCashParty(Party $party, string $fieldLabel): void
    {
        if (
            $party->getOwnershipType() === Party::OWNERSHIP_OWN
            && $party->getType() === Party::TYPE_CASH
        ) {
            return;
        }

        throw new \InvalidArgumentException(sprintf(
            'Dla transakcji ręcznej pole %s wymaga podmiotu typu gotówka (własny). Wybrano: „%s”.',
            $fieldLabel,
            $party->getName(),
        ));
    }
}
