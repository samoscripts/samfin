<?php

namespace App\Home\Report\Settlement\Service;

use App\Home\Report\Settlement\DTO\SettlementQuery;
use App\Home\Report\Settlement\Entity\SettlementConfig;
use App\Home\Report\Settlement\Entity\SettlementPeriod;
use App\Home\Report\Settlement\Repository\SettlementItemQuery;
use App\Home\Report\Settlement\Repository\SettlementLedgerRepository;

class SettlementService
{
    public function __construct(
        private SettlementItemQuery $itemQuery,
        private SettlementLedgerRepository $ledgerRepository,
        private SettlementItemClassifier $classifier,
        private SettlementOutlookBuilder $outlookBuilder,
        private SettlementPeriodService $periodService,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function calculate(SettlementQuery $query, SettlementConfig $config): array
    {
        if (!$config->isConfigured()) {
            throw new \InvalidArgumentException('Raport wymaga skonfigurowania podmiotu rozliczenia i portfela budżetu domowego.');
        }

        $user = $config->getUser();
        if ($user === null) {
            throw new \InvalidArgumentException('Brak użytkownika w konfiguracji rozliczenia.');
        }

        $settlementPeriodMeta = null;
        $period = null;
        $itemDateFrom = $query->dateFrom;
        $itemDateTo   = $query->dateTo;
        $outlookDateTo = $query->dateTo;

        if ($query->settlementYear !== null) {
            $this->periodService->ensurePeriodsReady($user, $config);
            $period = $this->periodService->resolvePeriod($user, $config, $query->settlementYear);
            $bounds = $this->periodService->resolveDateBounds($period, $config);
            $itemDateFrom = $bounds['effectiveFrom'];
            $itemDateTo   = $bounds['effectiveTo'];
            $outlookDateTo = $bounds['effectiveTo'];
            $settlementPeriodMeta = $period->toApiArray() + [
                'effectiveFrom' => $bounds['effectiveFrom'],
                'effectiveTo'   => $bounds['effectiveTo'],
            ];
        }

        $settlementPartyId = $config->getSettlementParty()->getId();
        $homeBudgetId      = $config->getHomeBudgetWallet()->getId();
        $maciekSources     = $config->getMaciekSourcePartyIds();
        $basiaSources      = $config->getBasiaSourcePartyIds();
        $walletOwners      = $config->getWalletSettlementOwner();
        $baseMinor         = $config->getBaseDepositAmountMinor();

        $items = $this->itemQuery->fetchItemsForPeriod(
            $itemDateFrom,
            $itemDateTo,
            $settlementPartyId,
            $query->includePartial,
            $homeBudgetId,
            $maciekSources,
            $basiaSources,
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
        $sourceExpenseDepositsMinor = [
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
                    $maciekSources,
                    $basiaSources,
                    $walletOwners,
                    $walletGroupsMinor,
                    $sourceExpenseDepositsMinor,
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
        $sourceExpenseDeposits = [
            'maciek' => $this->finalizeBucket($sourceExpenseDepositsMinor['maciek']),
            'basia'  => $this->finalizeBucket($sourceExpenseDepositsMinor['basia']),
        ];

        $user = $config->getUser();
        $useLedger = $user !== null && !$config->isNeedsRefresh();

        if ($period !== null && $period->isClosed()) {
            $outlook = $this->buildPersonOutlookFromSnapshot($config, $period, $walletGroups, $baseMinor, $outlookDateTo);
        } elseif ($useLedger && $query->settlementYear !== null) {
            $outlook = $this->buildPersonOutlookFromLedger($config, $walletGroups, $baseMinor, $outlookDateTo);
        } elseif ($useLedger && $query->settlementYear === null) {
            $outlook = $this->buildPersonOutlookFromLedger($config, $walletGroups, $baseMinor);
        } else {
            $engine = $this->replayEngineToDate(
                $config,
                $outlookDateTo,
                $settlementPartyId,
                $homeBudgetId,
                $maciekSources,
                $basiaSources,
            );
            $outlook = $this->outlookBuilder->build(
                $engine,
                $walletGroups,
                $baseMinor,
                $walletOwners,
                $outlookDateTo,
            );
        }

        $result = [
            'dateFrom'           => $itemDateFrom,
            'dateTo'             => $itemDateTo,
            'config'             => $config->toApiArray(),
            'walletGroups'           => $walletGroups,
            'standardDeposits'       => $standardDeposits,
            'sourceExpenseDeposits'  => $sourceExpenseDeposits,
            'rotation'               => $outlook['rotation'],
            'personOutlook'      => $outlook['personOutlook'],
            'warnings'           => array_values(array_unique($warnings)),
            'excludedItemsCount' => $excludedCount,
            'indexState'         => [
                'needsRefresh'      => $config->isNeedsRefresh(),
                'refreshInProgress' => $config->isRefreshInProgress(),
                'lastRefreshedAt'   => $config->getLastRefreshedAt()?->format(\DateTimeInterface::ATOM),
                'lastRefreshStats'  => $config->getLastRefreshStatsJson(),
            ],
        ];

        if ($settlementPeriodMeta !== null) {
            $result['settlementPeriod'] = $settlementPeriodMeta;
            $result['settlementYear'] = $settlementPeriodMeta['year'];
        }

        return $result;
    }

    /**
     * @param array<string, array{expenses: array{total: float, items: list}, incomes: array{total: float, items: list}, net: float}> $walletGroups
     *
     * @return array{rotation: array<string, mixed>, personOutlook: array<string, array<string, mixed>>}
     */
    private function buildPersonOutlookFromSnapshot(
        SettlementConfig $config,
        SettlementPeriod $period,
        array $walletGroups,
        int $baseMinor,
        string $asOfDate,
    ): array {
        $snapshot = $period->getClosingSnapshotJson();
        if ($snapshot === null) {
            throw new \RuntimeException('Brak snapshotu zamkniętego okresu rozliczeniowego.');
        }

        $walletOwners = $config->getWalletSettlementOwner();
        $engine = SettlementRotationEngine::fromSnapshot($snapshot, $baseMinor, $walletOwners);

        return $this->outlookBuilder->build(
            $engine,
            $walletGroups,
            $baseMinor,
            $walletOwners,
            $asOfDate,
        );
    }

    /**
     * @param array<string, array{expenses: array{total: float, items: list}, incomes: array{total: float, items: list}, net: float}> $walletGroups
     *
     * @return array{rotation: array<string, mixed>, personOutlook: array<string, array<string, mixed>>}
     */
    private function buildPersonOutlookFromLedger(
        SettlementConfig $config,
        array $walletGroups,
        int $baseMinor,
        ?string $asOfDate = null,
    ): array {
        $user = $config->getUser();
        $reindexFrom = $config->getReindexFromDate()?->format('Y-m-d');
        $entry = $asOfDate !== null
            ? $this->ledgerRepository->findLastAtOrBefore($user, $asOfDate, $reindexFrom)
            : $this->ledgerRepository->findLatestEntry($user, $reindexFrom);
        $walletOwners = $config->getWalletSettlementOwner();

        if ($entry === null) {
            $engine = $this->buildEngineFromConfig($config);

            return $this->outlookBuilder->build(
                $engine,
                $walletGroups,
                $baseMinor,
                $walletOwners,
                $asOfDate,
            );
        }

        $engine = SettlementRotationEngine::fromLedgerRow(
            [
                'wallet_balances_json'          => $entry->getWalletBalancesJson(),
                'maciek_deposits_total_minor'   => $entry->getMaciekDepositsTotalMinor(),
                'basia_deposits_total_minor'    => $entry->getBasiaDepositsTotalMinor(),
                'anchor'                        => $entry->getAnchor(),
                'rotation_prepaid_maciek_minor' => $entry->getRotationPrepaidMaciekMinor(),
                'rotation_prepaid_basia_minor'  => $entry->getRotationPrepaidBasiaMinor(),
            ],
            $baseMinor,
            $walletOwners,
        );

        $ledgerAsOf = $asOfDate ?? $entry->getOperationDate()->format('Y-m-d');

        return $this->outlookBuilder->build(
            $engine,
            $walletGroups,
            $baseMinor,
            $walletOwners,
            $ledgerAsOf,
        );
    }

    private function buildEngineFromConfig(SettlementConfig $config): SettlementRotationEngine
    {
        return new SettlementRotationEngine(
            $config->getBaseDepositAmountMinor(),
            $config->getWalletSettlementOwner(),
            $config->getOpeningNextDepositor(),
            $config->getOpeningRotationPrepaidMaciekMinor(),
            $config->getOpeningRotationPrepaidBasiaMinor(),
            $config->getOpeningWalletBalancesJson() ?? [],
        );
    }

    private function replayEngineToDate(
        SettlementConfig $config,
        string $dateTo,
        int $settlementPartyId,
        int $homeBudgetId,
        array $maciekSources,
        array $basiaSources,
    ): SettlementRotationEngine {
        $engine = $this->buildEngineFromConfig($config);
        $reindexFrom = $config->getReindexFromDate()?->format('Y-m-d') ?? '2000-01-01';
        $walletOwners = $config->getWalletSettlementOwner();

        $items = $this->itemQuery->fetchItemsFromDate(
            $reindexFrom,
            $settlementPartyId,
            false,
            $homeBudgetId,
            $maciekSources,
            $basiaSources,
        );

        foreach ($items as $item) {
            if ($item['operationDate'] > $dateTo) {
                break;
            }

            $fact = $this->classifier->classifyFact(
                $item,
                $settlementPartyId,
                $homeBudgetId,
                $maciekSources,
                $basiaSources,
                $walletOwners,
            );

            if ($fact !== null) {
                $engine->applyFact($fact);
            }
        }

        return $engine;
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

    /**
     * @param array<string, mixed> $item
     * @param list<int>            $maciekSources
     * @param list<int>            $basiaSources
     * @param array<string, array{expenses: array{total: int, items: list}, incomes: array{total: int, items: list}}> $walletGroupsMinor
     * @param array{maciek: array{total: int, items: list}, basia: array{total: int, items: list}} $sourceExpenseDepositsMinor
     * @param list<string> $warnings
     */
    private function processExpense(
        array $item,
        int $amountMinor,
        int $settlementPartyId,
        int $homeBudgetId,
        array $maciekSources,
        array $basiaSources,
        array $walletOwners,
        array &$walletGroupsMinor,
        array &$sourceExpenseDepositsMinor,
        int &$excludedCount,
        array &$warnings,
    ): void {
        $fromId = $item['paidFromPartyId'];

        if ($item['walletId'] === $homeBudgetId && $fromId !== null && $fromId !== $settlementPartyId) {
            if (in_array($fromId, $maciekSources, true)) {
                $sourceExpenseDepositsMinor['maciek']['total'] += $amountMinor;
                $sourceExpenseDepositsMinor['maciek']['items'][] = $this->itemEntry(
                    $item,
                    $amountMinor,
                    SettlementItemClassifier::ENTRY_SOURCE_EXP_DEPOSIT,
                );

                return;
            }
            if (in_array($fromId, $basiaSources, true)) {
                $sourceExpenseDepositsMinor['basia']['total'] += $amountMinor;
                $sourceExpenseDepositsMinor['basia']['items'][] = $this->itemEntry(
                    $item,
                    $amountMinor,
                    SettlementItemClassifier::ENTRY_SOURCE_EXP_DEPOSIT,
                );

                return;
            }
        }

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
