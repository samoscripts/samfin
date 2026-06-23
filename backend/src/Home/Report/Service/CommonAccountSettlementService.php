<?php

namespace App\Home\Report\Service;

use App\Home\Report\DTO\CommonAccountSettlementQuery;
use App\Home\Report\Entity\CommonAccountSettlementConfig;
use App\Home\Report\Repository\CommonAccountSettlementItemQuery;

class CommonAccountSettlementService
{
    public function __construct(
        private CommonAccountSettlementItemQuery $itemQuery,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function calculate(CommonAccountSettlementQuery $query, CommonAccountSettlementConfig $config): array
    {
        if (!$config->isConfigured()) {
            throw new \InvalidArgumentException('Raport wymaga skonfigurowania konta wspólnego i portfela budżetu domowego.');
        }

        $commonPartyId = $config->getCommonAccountParty()->getId();
        $homeBudgetId  = $config->getHomeBudgetWallet()->getId();
        $maciekSources = $config->getMaciekSourcePartyIds();
        $basiaSources  = $config->getBasiaSourcePartyIds();
        $walletOwners  = $config->getWalletSettlementOwner();
        $baseMinor     = $config->getBaseDepositAmountMinor();

        $items = $this->itemQuery->fetchItemsForPeriod(
            $query->dateFrom,
            $query->dateTo,
            $commonPartyId,
            $query->includePartial,
        );

        $walletGroupsMinor = [
            'maciek' => $this->emptyWalletGroupMinor(),
            'basia'  => $this->emptyWalletGroupMinor(),
            'other'  => $this->emptyWalletGroupMinor(),
        ];
        $standardDepositsMinor = [
            'maciek' => ['total' => 0, 'items' => []],
            'basia'  => ['total' => 0, 'items' => []],
        ];
        $warnings      = [];
        $excludedCount = 0;

        foreach ($items as $item) {
            $amountMinor = abs($item['amountMinor']);

            if ($item['direction'] === 'EXPENSE') {
                $this->processExpense(
                    $item,
                    $amountMinor,
                    $commonPartyId,
                    $homeBudgetId,
                    $walletOwners,
                    $walletGroupsMinor,
                    $excludedCount,
                    $warnings,
                );
                continue;
            }

            if ($item['direction'] === 'INCOME') {
                $this->processIncome(
                    $item,
                    $amountMinor,
                    $commonPartyId,
                    $homeBudgetId,
                    $maciekSources,
                    $basiaSources,
                    $walletOwners,
                    $walletGroupsMinor,
                    $standardDepositsMinor,
                    $excludedCount,
                    $warnings,
                );
            }
        }

        $walletGroups = $this->finalizeWalletGroups($walletGroupsMinor);
        $standardDeposits = [
            'maciek' => $this->finalizeBucket($standardDepositsMinor['maciek']),
            'basia'  => $this->finalizeBucket($standardDepositsMinor['basia']),
        ];

        if ($walletGroups['other']['expenses']['total'] > 0 || $walletGroups['other']['incomes']['total'] > 0) {
            $warnings[] = 'Część pozycji jest w grupie Inne i nie wpływa na wyliczenie wpłaty. Przypisz portfele w konfiguracji.';
        }

        $nextDepositor = $query->nextDepositor ?? $this->resolveNextDepositor(
            $query->dateTo,
            $commonPartyId,
            $homeBudgetId,
            $maciekSources,
            $basiaSources,
            $config->getDefaultNextDepositor(),
        );

        $carryOverMaciek = $config->getCarryOverMaciekMinor();
        $carryOverBasia  = $config->getCarryOverBasiaMinor();

        $personNetMinor   = (int) round($walletGroups[$nextDepositor]['net'] * 100);
        $walletCorrection = max(0, $personNetMinor);
        $carryOver        = $nextDepositor === 'maciek' ? $carryOverMaciek : $carryOverBasia;
        $dueMinor         = $baseMinor + $walletCorrection + $carryOver;
        $paidMinor        = $standardDepositsMinor[$nextDepositor]['total'];
        $balanceMinor     = $dueMinor - $paidMinor;

        $nextDeposit = [
            'person'       => $nextDepositor,
            'baseAmount'   => round($baseMinor / 100, 2),
            'walletNet'    => round($personNetMinor / 100, 2),
            'corrections'  => round($walletCorrection / 100, 2),
            'carryOver'    => round($carryOver / 100, 2),
            'dueAmount'    => round($dueMinor / 100, 2),
            'paidInPeriod' => round($paidMinor / 100, 2),
            'balance'      => round($balanceMinor / 100, 2),
            'underpayment' => round(max(0, $balanceMinor) / 100, 2),
            'overpayment'  => round(max(0, -$balanceMinor) / 100, 2),
            'carryForward' => round(max(0, $balanceMinor) / 100, 2),
        ];

        $balances = [];
        foreach (['maciek', 'basia'] as $person) {
            $balances[$person] = [
                'walletNet'      => $walletGroups[$person]['net'],
                'carryOver'    => round(($person === 'maciek' ? $carryOverMaciek : $carryOverBasia) / 100, 2),
                'paidInPeriod' => $standardDeposits[$person]['total'],
            ];
        }

        return [
            'dateFrom'           => $query->dateFrom,
            'dateTo'             => $query->dateTo,
            'config'             => $config->toApiArray(),
            'walletGroups'       => $walletGroups,
            'standardDeposits'   => $standardDeposits,
            'nextDeposit'        => $nextDeposit,
            'balances'           => $balances,
            'warnings'           => array_values(array_unique($warnings)),
            'excludedItemsCount' => $excludedCount,
        ];
    }

    /** @return array{expenses: array{total: int, items: list}, incomes: array{total: int, items: list}} */
    private function emptyWalletGroupMinor(): array
    {
        return [
            'expenses' => ['total' => 0, 'items' => []],
            'incomes'  => ['total' => 0, 'items' => []],
        ];
    }

    /**
     * @param array{expenses: array{total: int, items: list}, incomes: array{total: int, items: list}} $group
     * @return array{expenses: array{total: float, items: list}, incomes: array{total: float, items: list}, net: float}
     */
    private function finalizeBucket(array $group): array
    {
        return [
            'total' => round($group['total'] / 100, 2),
            'items' => $group['items'],
        ];
    }

    /**
     * @param array<string, array{expenses: array{total: int, items: list}, incomes: array{total: int, items: list}}> $groupsMinor
     * @return array<string, array{expenses: array{total: float, items: list}, incomes: array{total: float, items: list}, net: float}>
     */
    private function finalizeWalletGroups(array $groupsMinor): array
    {
        $result = [];
        foreach ($groupsMinor as $key => $group) {
            $expensesTotal = round($group['expenses']['total'] / 100, 2);
            $incomesTotal  = round($group['incomes']['total'] / 100, 2);
            $result[$key]  = [
                'expenses' => [
                    'total' => $expensesTotal,
                    'items' => $group['expenses']['items'],
                ],
                'incomes' => [
                    'total' => $incomesTotal,
                    'items' => $group['incomes']['items'],
                ],
                'net' => round($expensesTotal - $incomesTotal, 2),
            ];
        }

        return $result;
    }

    private function resolveWalletGroupKey(?int $walletId, array $walletOwners): string
    {
        if ($walletId === null) {
            return 'other';
        }

        $owner = $walletOwners[(string) $walletId] ?? null;
        if ($owner === 'maciek' || $owner === 'basia') {
            return $owner;
        }

        return 'other';
    }

    private function resolveNextDepositor(
        string $dateTo,
        int $commonPartyId,
        int $homeBudgetId,
        array $maciekSources,
        array $basiaSources,
        string $default,
    ): string {
        $last = $this->itemQuery->findLastStandardDeposit(
            $dateTo,
            $commonPartyId,
            $homeBudgetId,
            $maciekSources,
            $basiaSources,
        );

        if ($last === null) {
            return $default;
        }

        return $last['person'] === 'maciek'
            ? CommonAccountSettlementConfig::DEPOSITOR_BASIA
            : CommonAccountSettlementConfig::DEPOSITOR_MACIEK;
    }

    /**
     * @param array<string, mixed> $item
     * @param array<string, array{expenses: array{total: int, items: list}, incomes: array{total: int, items: list}}> $walletGroupsMinor
     * @param list<string> $warnings
     */
    private function processExpense(
        array $item,
        int $amountMinor,
        int $commonPartyId,
        int $homeBudgetId,
        array $walletOwners,
        array &$walletGroupsMinor,
        int &$excludedCount,
        array &$warnings,
    ): void {
        if ($item['paidFromPartyId'] !== $commonPartyId) {
            return;
        }

        if ($item['walletId'] === null) {
            $excludedCount++;
            $groupKey = 'other';
            $walletGroupsMinor[$groupKey]['expenses']['total'] += $amountMinor;
            $walletGroupsMinor[$groupKey]['expenses']['items'][] = $this->itemEntry($item, $amountMinor, 'expense');
            $warnings[] = 'Wydatek ze wspólnego bez portfela pozycji — trafia do grupy Inne.';
            return;
        }

        if ($item['walletId'] === $homeBudgetId) {
            return;
        }

        $groupKey = $this->resolveWalletGroupKey($item['walletId'], $walletOwners);
        $walletGroupsMinor[$groupKey]['expenses']['total'] += $amountMinor;
        $walletGroupsMinor[$groupKey]['expenses']['items'][] = $this->itemEntry($item, $amountMinor, 'expense');
    }

    /**
     * @param array<string, mixed> $item
     * @param array<string, array{expenses: array{total: int, items: list}, incomes: array{total: int, items: list}}> $walletGroupsMinor
     * @param array{maciek: array{total: int, items: list}, basia: array{total: int, items: list}} $standardDepositsMinor
     * @param list<string> $warnings
     */
    private function processIncome(
        array $item,
        int $amountMinor,
        int $commonPartyId,
        int $homeBudgetId,
        array $maciekSources,
        array $basiaSources,
        array $walletOwners,
        array &$walletGroupsMinor,
        array &$standardDepositsMinor,
        int &$excludedCount,
        array &$warnings,
    ): void {
        if ($item['paidToPartyId'] !== $commonPartyId) {
            return;
        }

        $isHome = $item['walletId'] === $homeBudgetId;
        $fromId = $item['paidFromPartyId'];

        if ($isHome && $fromId !== null) {
            if (in_array($fromId, $maciekSources, true)) {
                $standardDepositsMinor['maciek']['total'] += $amountMinor;
                $standardDepositsMinor['maciek']['items'][] = $this->itemEntry($item, $amountMinor, 'standard_deposit');
                return;
            }
            if (in_array($fromId, $basiaSources, true)) {
                $standardDepositsMinor['basia']['total'] += $amountMinor;
                $standardDepositsMinor['basia']['items'][] = $this->itemEntry($item, $amountMinor, 'standard_deposit');
                return;
            }
        }

        if ($fromId === null) {
            $excludedCount++;
            $warnings[] = 'Wpływ na konto wspólne bez Skąd — trafia do grupy Inne.';
        }

        if ($item['walletId'] === null) {
            $excludedCount++;
        }

        $groupKey = $item['walletId'] === null
            ? 'other'
            : ($isHome ? 'other' : $this->resolveWalletGroupKey($item['walletId'], $walletOwners));

        if ($isHome && $fromId !== null) {
            $groupKey = 'other';
        }

        $walletGroupsMinor[$groupKey]['incomes']['total'] += $amountMinor;
        $walletGroupsMinor[$groupKey]['incomes']['items'][] = $this->itemEntry($item, $amountMinor, 'income');
    }

    /** @param array<string, mixed> $item */
    private function itemEntry(array $item, int $amountMinor, string $kind): array
    {
        return $this->itemRef($item) + [
            'amount' => round($amountMinor / 100, 2),
            'kind'   => $kind,
        ];
    }

    /** @param array<string, mixed> $item */
    private function itemRef(array $item): array
    {
        return [
            'transactionId' => $item['transactionId'],
            'itemId'        => $item['itemId'],
            'date'          => $item['operationDate'],
            'description'   => $item['description'],
            'paidFrom'      => $item['paidFrom'],
            'paidTo'        => $item['paidTo'],
            'wallet'        => $item['wallet'],
        ];
    }
}
