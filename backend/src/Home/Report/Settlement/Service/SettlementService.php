<?php

namespace App\Home\Report\Settlement\Service;

use App\Home\Report\Settlement\DTO\SettlementQuery;
use App\Home\Report\Settlement\Entity\SettlementConfig;
use App\Home\Report\Settlement\Entity\SettlementLedgerEntry;
use App\Home\Report\Settlement\Repository\SettlementItemQuery;
use App\Home\Report\Settlement\Repository\SettlementLedgerRepository;
use App\Identity\Entity\User;

class SettlementService
{
    public function __construct(
        private SettlementItemQuery $itemQuery,
        private SettlementLedgerRepository $ledgerRepository,
        private SettlementItemClassifier $classifier,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function calculate(SettlementQuery $query, SettlementConfig $config): array
    {
        if (!$config->isConfigured()) {
            throw new \InvalidArgumentException('Raport wymaga skonfigurowania podmiotu rozliczenia i portfela budżetu domowego.');
        }

        $settlementPartyId = $config->getSettlementParty()->getId();
        $homeBudgetId      = $config->getHomeBudgetWallet()->getId();
        $maciekSources     = $config->getMaciekSourcePartyIds();
        $basiaSources      = $config->getBasiaSourcePartyIds();
        $walletOwners      = $config->getWalletSettlementOwner();
        $baseMinor         = $config->getBaseDepositAmountMinor();

        $items = $this->itemQuery->fetchItemsForPeriod(
            $query->dateFrom,
            $query->dateTo,
            $settlementPartyId,
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

            $this->classifier->collectWarnings(
                $item,
                $settlementPartyId,
                $homeBudgetId,
                $maciekSources,
                $basiaSources,
                $walletOwners,
                $warnings,
                $excludedCount,
            );

            if ($item['direction'] === 'EXPENSE') {
                $this->processExpense(
                    $item,
                    $amountMinor,
                    $settlementPartyId,
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
                    $settlementPartyId,
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

        $user = $config->getUser();
        $useLedger = $user !== null && !$config->isNeedsRefresh();

        if ($useLedger) {
            $nextDeposit = $this->buildNextDepositFromLedger(
                $config,
                $query,
                $standardDepositsMinor,
                $baseMinor,
            );
        } else {
            $nextDeposit = $this->buildNextDepositLegacy(
                $query,
                $config,
                $walletGroups,
                $standardDepositsMinor,
                $settlementPartyId,
                $homeBudgetId,
                $maciekSources,
                $basiaSources,
                $baseMinor,
            );
        }

        $balances = [];
        foreach (['maciek', 'basia'] as $person) {
            $balances[$person] = [
                'walletNet'      => $walletGroups[$person]['net'],
                'carryOver'      => 0,
                'paidInPeriod'   => $standardDeposits[$person]['total'],
            ];
        }

        if ($useLedger && $user !== null) {
            $reindexFrom = $config->getReindexFromDate()?->format('Y-m-d');
            $ledgerEntry = $this->ledgerRepository->findLatestEntry($user, $reindexFrom);
            if ($ledgerEntry !== null) {
                $balances['maciek']['walletNetLedger'] = $this->walletNetFromLedger($ledgerEntry, 'maciek', $walletOwners);
                $balances['basia']['walletNetLedger']  = $this->walletNetFromLedger($ledgerEntry, 'basia', $walletOwners);
            }
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
            'indexState'         => [
                'needsRefresh'      => $config->isNeedsRefresh(),
                'refreshInProgress' => $config->isRefreshInProgress(),
                'lastRefreshedAt'   => $config->getLastRefreshedAt()?->format(\DateTimeInterface::ATOM),
                'lastRefreshStats'  => $config->getLastRefreshStatsJson(),
            ],
        ];
    }

    /**
     * @param array{maciek: array{total: int, items: list}, basia: array{total: int, items: list}} $standardDepositsMinor
     *
     * @return array<string, mixed>
     */
    private function buildNextDepositFromLedger(
        SettlementConfig $config,
        SettlementQuery $query,
        array $standardDepositsMinor,
        int $baseMinor,
    ): array {
        $user = $config->getUser();
        $reindexFrom = $config->getReindexFromDate()?->format('Y-m-d');
        $entry = $this->ledgerRepository->findLatestEntry($user, $reindexFrom);

        if ($entry === null) {
            return $this->buildNextDepositFromOpening($config, $query, $standardDepositsMinor, $baseMinor);
        }

        $engine = SettlementBalanceEngine::fromLedgerRow(
            [
                'wallet_balances_json'           => $entry->getWalletBalancesJson(),
                'rotation_carry_minor'           => $entry->getRotationCarryMinor(),
                'rotation_prepaid_maciek_minor'  => $entry->getRotationPrepaidMaciekMinor(),
                'rotation_prepaid_basia_minor'   => $entry->getRotationPrepaidBasiaMinor(),
                'next_depositor'                 => $entry->getNextDepositor(),
            ],
            $baseMinor,
            $config->getWalletSettlementOwner(),
        );

        $person = $query->nextDepositor ?? $engine->getNextDepositor();
        $walletNetMinor = $engine->walletBalanceForPerson($person);
        $prepaidMinor   = $person === SettlementConfig::DEPOSITOR_MACIEK
            ? $engine->getRotationPrepaidMaciekMinor()
            : $engine->getRotationPrepaidBasiaMinor();
        $suggestedRaw   = $baseMinor - $engine->getRotationCarryMinor() + $walletNetMinor - $prepaidMinor;
        $suggestedMinor = max(0, $suggestedRaw);
        $paidMinor      = $standardDepositsMinor[$person]['total'];

        $result = $this->formatNextDeposit(
            $person,
            $baseMinor,
            $walletNetMinor,
            $engine->getRotationCarryMinor(),
            $prepaidMinor,
            $suggestedMinor,
            $suggestedRaw,
            $paidMinor,
            $engine->getWalletBalancesMinor(),
            $config->getWalletSettlementOwner(),
        );
        $result['asOfDate'] = $entry->getOperationDate()->format('Y-m-d');

        return $result;
    }

    /**
     * @param array{maciek: array{total: int, items: list}, basia: array{total: int, items: list}} $standardDepositsMinor
     *
     * @return array<string, mixed>
     */
    private function buildNextDepositFromOpening(
        SettlementConfig $config,
        SettlementQuery $query,
        array $standardDepositsMinor,
        int $baseMinor,
    ): array {
        $engine = new SettlementBalanceEngine(
            $baseMinor,
            $config->getWalletSettlementOwner(),
            $config->getOpeningNextDepositor(),
            0,
            $config->getOpeningRotationPrepaidMaciekMinor(),
            $config->getOpeningRotationPrepaidBasiaMinor(),
            $config->getOpeningWalletBalancesJson(),
        );

        $person = $query->nextDepositor ?? $engine->getNextDepositor();
        $walletNetMinor = $engine->walletBalanceForPerson($person);
        $prepaidMinor   = $person === SettlementConfig::DEPOSITOR_MACIEK
            ? $engine->getRotationPrepaidMaciekMinor()
            : $engine->getRotationPrepaidBasiaMinor();
        $suggestedRaw   = $baseMinor - $engine->getRotationCarryMinor() + $walletNetMinor - $prepaidMinor;
        $suggestedMinor = max(0, $suggestedRaw);
        $paidMinor      = $standardDepositsMinor[$person]['total'];

        return $this->formatNextDeposit(
            $person,
            $baseMinor,
            $walletNetMinor,
            $engine->getRotationCarryMinor(),
            $prepaidMinor,
            $suggestedMinor,
            $suggestedRaw,
            $paidMinor,
            $engine->getWalletBalancesMinor(),
            $config->getWalletSettlementOwner(),
        );
    }

    /**
     * @param array<string, int> $walletBalancesMinor
     * @param array<string, string> $walletOwners
     *
     * @return array<string, mixed>
     */
    private function formatNextDeposit(
        string $person,
        int $baseMinor,
        int $walletNetMinor,
        int $rotationCarryMinor,
        int $prepaidMinor,
        int $suggestedMinor,
        int $suggestedRawMinor,
        int $paidMinor,
        array $walletBalancesMinor,
        array $walletOwners,
    ): array {
        $balanceMinor = $suggestedMinor - $paidMinor;

        return [
            'person'            => $person,
            'baseAmount'        => round($baseMinor / 100, 2),
            'walletNet'         => round($walletNetMinor / 100, 2),
            'rotationCarry'     => round($rotationCarryMinor / 100, 2),
            'rotationPrepaid'   => round($prepaidMinor / 100, 2),
            'suggestedAmount'   => round($suggestedMinor / 100, 2),
            'suggestedAmountRaw'=> round($suggestedRawMinor / 100, 2),
            'overpaymentCredit' => round(max(0, -$suggestedRawMinor) / 100, 2),
            'corrections'       => round($walletNetMinor / 100, 2),
            'carryOver'         => round($rotationCarryMinor / 100, 2),
            'dueAmount'         => round($suggestedMinor / 100, 2),
            'paidInPeriod'      => round($paidMinor / 100, 2),
            'balance'           => round($balanceMinor / 100, 2),
            'underpayment'      => round(max(0, $balanceMinor) / 100, 2),
            'overpayment'       => round(max(0, -$balanceMinor) / 100, 2),
            'carryForward'      => round(max(0, $balanceMinor) / 100, 2),
            'walletBreakdown'   => $this->walletBreakdownForPerson($walletBalancesMinor, $walletOwners, $person),
        ];
    }

    /**
     * @param array<string, int> $walletBalancesMinor
     * @param array<string, string> $walletOwners
     *
     * @return list<array{walletId: int, balance: float}>
     */
    private function walletBreakdownForPerson(array $walletBalancesMinor, array $walletOwners, string $person): array
    {
        $result = [];
        foreach ($walletBalancesMinor as $walletId => $balanceMinor) {
            if (($walletOwners[$walletId] ?? null) !== $person) {
                continue;
            }
            if ($balanceMinor === 0) {
                continue;
            }
            $result[] = [
                'walletId' => (int) $walletId,
                'balance'  => round($balanceMinor / 100, 2),
            ];
        }

        return $result;
    }

    /**
     * @param array<string, string> $walletOwners
     */
    private function walletNetFromLedger(SettlementLedgerEntry $entry, string $person, array $walletOwners): float
    {
        $sum = 0;
        foreach ($entry->getWalletBalancesJson() as $walletId => $balance) {
            if (($walletOwners[$walletId] ?? null) === $person) {
                $sum += (int) $balance;
            }
        }

        return round($sum / 100, 2);
    }

    /**
     * @param array<string, array{expenses: array{total: float, items: list}, incomes: array{total: float, items: list}, net: float}> $walletGroups
     * @param array{maciek: array{total: int, items: list}, basia: array{total: int, items: list}} $standardDepositsMinor
     *
     * @return array<string, mixed>
     */
    private function buildNextDepositLegacy(
        SettlementQuery $query,
        SettlementConfig $config,
        array $walletGroups,
        array $standardDepositsMinor,
        int $settlementPartyId,
        int $homeBudgetId,
        array $maciekSources,
        array $basiaSources,
        int $baseMinor,
    ): array {
        $nextDepositor = $query->nextDepositor ?? $this->resolveNextDepositor(
            $query->dateTo,
            $settlementPartyId,
            $homeBudgetId,
            $maciekSources,
            $basiaSources,
            $config->getDefaultNextDepositor(),
        );

        $carryOverMaciek = $config->getCarryOverMaciekMinor();
        $carryOverBasia  = $config->getCarryOverBasiaMinor();

        $personNetMinor   = (int) round($walletGroups[$nextDepositor]['net'] * 100);
        $carryOver        = $nextDepositor === 'maciek' ? $carryOverMaciek : $carryOverBasia;
        $dueMinor         = $baseMinor + $personNetMinor + $carryOver;
        $paidMinor        = $standardDepositsMinor[$nextDepositor]['total'];
        $balanceMinor     = $dueMinor - $paidMinor;

        return [
            'person'            => $nextDepositor,
            'baseAmount'        => round($baseMinor / 100, 2),
            'walletNet'         => round($personNetMinor / 100, 2),
            'rotationCarry'     => round($carryOver / 100, 2),
            'rotationPrepaid'   => 0.0,
            'suggestedAmount'   => round($dueMinor / 100, 2),
            'suggestedAmountRaw'=> round($dueMinor / 100, 2),
            'overpaymentCredit' => 0.0,
            'corrections'       => round($personNetMinor / 100, 2),
            'carryOver'         => round($carryOver / 100, 2),
            'dueAmount'         => round($dueMinor / 100, 2),
            'paidInPeriod'      => round($paidMinor / 100, 2),
            'balance'           => round($balanceMinor / 100, 2),
            'underpayment'      => round(max(0, $balanceMinor) / 100, 2),
            'overpayment'       => round(max(0, -$balanceMinor) / 100, 2),
            'carryForward'      => round(max(0, $balanceMinor) / 100, 2),
            'walletBreakdown'   => [],
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
        int $settlementPartyId,
        int $homeBudgetId,
        array $maciekSources,
        array $basiaSources,
        string $default,
    ): string {
        $last = $this->itemQuery->findLastStandardDeposit(
            $dateTo,
            $settlementPartyId,
            $homeBudgetId,
            $maciekSources,
            $basiaSources,
        );

        if ($last === null) {
            return $default;
        }

        return $last['person'] === 'maciek'
            ? SettlementConfig::DEPOSITOR_BASIA
            : SettlementConfig::DEPOSITOR_MACIEK;
    }

    /**
     * @param array<string, mixed> $item
     * @param array<string, array{expenses: array{total: int, items: list}, incomes: array{total: int, items: list}}> $walletGroupsMinor
     * @param list<string> $warnings
     */
    private function processExpense(
        array $item,
        int $amountMinor,
        int $settlementPartyId,
        int $homeBudgetId,
        array $walletOwners,
        array &$walletGroupsMinor,
        int &$excludedCount,
        array &$warnings,
    ): void {
        if ($item['paidFromPartyId'] !== $settlementPartyId) {
            return;
        }

        if ($item['walletId'] === null) {
            $excludedCount++;
            $groupKey = 'other';
            $walletGroupsMinor[$groupKey]['expenses']['total'] += $amountMinor;
            $walletGroupsMinor[$groupKey]['expenses']['items'][] = $this->itemEntry($item, $amountMinor, 'expense');
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
        int $settlementPartyId,
        int $homeBudgetId,
        array $maciekSources,
        array $basiaSources,
        array $walletOwners,
        array &$walletGroupsMinor,
        array &$standardDepositsMinor,
        int &$excludedCount,
        array &$warnings,
    ): void {
        if ($item['paidToPartyId'] !== $settlementPartyId) {
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
