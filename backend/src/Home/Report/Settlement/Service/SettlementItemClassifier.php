<?php

namespace App\Home\Report\Settlement\Service;

/**
 * Classifies a single transaction_item for settlement ledger indexing.
 */
class SettlementItemClassifier
{
    public const ENTRY_WALLET_EXPENSE    = 'wallet_expense';
    public const ENTRY_WALLET_INCOME     = 'wallet_income';
    public const ENTRY_STANDARD_DEPOSIT  = 'standard_deposit';

    /**
     * @param array<string, mixed> $item
     *
     * @return array{
     *   entryType: string,
     *   person: string,
     *   walletId: int,
     *   amountMinor: int,
     *   walletDeltaMinor: int,
     * }|null
     */
    public function classifyFact(
        array $item,
        int $settlementPartyId,
        int $homeBudgetWalletId,
        array $maciekSources,
        array $basiaSources,
        array $walletOwners,
    ): ?array {
        $amountMinor = abs((int) $item['amountMinor']);

        if ($item['direction'] === 'EXPENSE') {
            return $this->classifyExpense($item, $amountMinor, $settlementPartyId, $homeBudgetWalletId, $walletOwners);
        }

        if ($item['direction'] === 'INCOME') {
            return $this->classifyIncome(
                $item,
                $amountMinor,
                $settlementPartyId,
                $homeBudgetWalletId,
                $maciekSources,
                $basiaSources,
                $walletOwners,
            );
        }

        return null;
    }

    /**
     * @param array<string, mixed> $item
     * @param list<string>         $warnings
     */
    public function collectWarnings(
        array $item,
        int $settlementPartyId,
        int $homeBudgetWalletId,
        array $maciekSources,
        array $basiaSources,
        array $walletOwners,
        array &$warnings,
        int &$excludedCount,
    ): void {
        if ($item['direction'] === 'EXPENSE') {
            if ($item['paidFromPartyId'] !== $settlementPartyId) {
                return;
            }
            if ($item['walletId'] === null) {
                $excludedCount++;
                $warnings[] = 'Wydatek ze wspólnego bez portfela pozycji — trafia do grupy Inne.';
            }
            return;
        }

        if ($item['direction'] !== 'INCOME' || $item['paidToPartyId'] !== $settlementPartyId) {
            return;
        }

        $isHome = $item['walletId'] === $homeBudgetWalletId;
        $fromId = $item['paidFromPartyId'];

        if ($fromId === null) {
            $excludedCount++;
            $warnings[] = 'Wpływ na konto rozliczenia bez Skąd — trafia do grupy Inne.';
        }

        if ($item['walletId'] === null) {
            $excludedCount++;
        }

        if ($isHome && $fromId !== null
            && !in_array($fromId, $maciekSources, true)
            && !in_array($fromId, $basiaSources, true)
        ) {
            $warnings[] = 'Wpływ na budżet domowy ze źródła spoza list wpłacających — trafia do grupy Inne.';
        }

        if (!$isHome && $item['walletId'] !== null) {
            $owner = $walletOwners[(string) $item['walletId']] ?? null;
            if ($owner !== 'maciek' && $owner !== 'basia') {
                $warnings[] = 'Portfel bez przypisanego właściciela rozliczenia — trafia do grupy Inne.';
            }
        }
    }

    /**
     * @param array<string, mixed> $item
     * @param array<string, string> $walletOwners
     *
     * @return array{entryType: string, person: string, walletId: int, amountMinor: int, walletDeltaMinor: int}|null
     */
    private function classifyExpense(
        array $item,
        int $amountMinor,
        int $settlementPartyId,
        int $homeBudgetWalletId,
        array $walletOwners,
    ): ?array {
        if ($item['paidFromPartyId'] !== $settlementPartyId) {
            return null;
        }

        if ($item['walletId'] === null || $item['walletId'] === $homeBudgetWalletId) {
            return null;
        }

        $person = $this->resolvePerson($item['walletId'], $walletOwners);
        if ($person === null) {
            return null;
        }

        return [
            'entryType'        => self::ENTRY_WALLET_EXPENSE,
            'person'           => $person,
            'walletId'         => (int) $item['walletId'],
            'amountMinor'      => $amountMinor,
            'walletDeltaMinor' => $amountMinor,
        ];
    }

    /**
     * @param array<string, mixed> $item
     * @param list<int>            $maciekSources
     * @param list<int>            $basiaSources
     * @param array<string, string> $walletOwners
     *
     * @return array{entryType: string, person: string, walletId: int, amountMinor: int, walletDeltaMinor: int}|null
     */
    private function classifyIncome(
        array $item,
        int $amountMinor,
        int $settlementPartyId,
        int $homeBudgetWalletId,
        array $maciekSources,
        array $basiaSources,
        array $walletOwners,
    ): ?array {
        if ($item['paidToPartyId'] !== $settlementPartyId) {
            return null;
        }

        $isHome = $item['walletId'] === $homeBudgetWalletId;
        $fromId = $item['paidFromPartyId'];

        if ($isHome && $fromId !== null) {
            if (in_array($fromId, $maciekSources, true)) {
                return [
                    'entryType'        => self::ENTRY_STANDARD_DEPOSIT,
                    'person'           => 'maciek',
                    'walletId'         => $homeBudgetWalletId,
                    'amountMinor'      => $amountMinor,
                    'walletDeltaMinor' => 0,
                ];
            }
            if (in_array($fromId, $basiaSources, true)) {
                return [
                    'entryType'        => self::ENTRY_STANDARD_DEPOSIT,
                    'person'           => 'basia',
                    'walletId'         => $homeBudgetWalletId,
                    'amountMinor'      => $amountMinor,
                    'walletDeltaMinor' => 0,
                ];
            }

            return null;
        }

        if ($item['walletId'] === null || $isHome) {
            return null;
        }

        $person = $this->resolvePerson($item['walletId'], $walletOwners);
        if ($person === null) {
            return null;
        }

        return [
            'entryType'        => self::ENTRY_WALLET_INCOME,
            'person'           => $person,
            'walletId'         => (int) $item['walletId'],
            'amountMinor'      => $amountMinor,
            'walletDeltaMinor' => -$amountMinor,
        ];
    }

    /** @param array<string, string> $walletOwners */
    private function resolvePerson(int $walletId, array $walletOwners): ?string
    {
        $owner = $walletOwners[(string) $walletId] ?? null;

        return ($owner === 'maciek' || $owner === 'basia') ? $owner : null;
    }
}
