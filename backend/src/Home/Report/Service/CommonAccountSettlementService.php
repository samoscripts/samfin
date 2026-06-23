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

        $commonPartyId   = $config->getCommonAccountParty()->getId();
        $homeBudgetId    = $config->getHomeBudgetWallet()->getId();
        $maciekSources   = $config->getMaciekSourcePartyIds();
        $basiaSources    = $config->getBasiaSourcePartyIds();
        $walletOwners    = $config->getWalletSettlementOwner();
        $baseMinor       = $config->getBaseDepositAmountMinor();

        $items = $this->itemQuery->fetchItemsForPeriod(
            $query->dateFrom,
            $query->dateTo,
            $commonPartyId,
            $query->includePartial,
        );

        $corrections          = ['total' => 0.0, 'items' => []];
        $correctionsByPerson  = ['maciek' => 0, 'basia' => 0];
        $unassignedCorrection = 0;
        $expensesFromCommon   = [];
        $deposits             = [
            'maciek' => ['total' => 0.0, 'items' => []],
            'basia'  => ['total' => 0.0, 'items' => []],
            'other'  => ['total' => 0.0, 'items' => []],
        ];
        $warnings             = [];
        $excludedCount        = 0;

        foreach ($items as $item) {
            $amountMinor = abs($item['amountMinor']);
            $ref         = $this->itemRef($item);

            if ($item['direction'] === 'EXPENSE') {
                $this->processExpense(
                    $item,
                    $amountMinor,
                    $commonPartyId,
                    $homeBudgetId,
                    $walletOwners,
                    $corrections,
                    $correctionsByPerson,
                    $unassignedCorrection,
                    $expensesFromCommon,
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
                    $deposits,
                    $excludedCount,
                    $warnings,
                );
            }
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

        $personCorrections = $correctionsByPerson[$nextDepositor] + $unassignedCorrection;
        $carryOver         = $nextDepositor === 'maciek' ? $carryOverMaciek : $carryOverBasia;
        $dueMinor          = $baseMinor + (int) round($personCorrections) + $carryOver;
        $paidMinor         = (int) round($deposits[$nextDepositor]['total'] * 100);
        $balanceMinor      = $dueMinor - $paidMinor;

        $nextDeposit = [
            'person'            => $nextDepositor,
            'baseAmount'        => round($baseMinor / 100, 2),
            'corrections'       => round($personCorrections / 100, 2),
            'correctionsDetail' => [
                'assigned'   => round($correctionsByPerson[$nextDepositor] / 100, 2),
                'unassigned' => round($unassignedCorrection / 100, 2),
            ],
            'carryOver'         => round($carryOver / 100, 2),
            'dueAmount'         => round($dueMinor / 100, 2),
            'paidInPeriod'      => round($paidMinor / 100, 2),
            'balance'           => round($balanceMinor / 100, 2),
            'underpayment'      => round(max(0, $balanceMinor) / 100, 2),
            'overpayment'       => round(max(0, -$balanceMinor) / 100, 2),
            'carryForward'      => round(max(0, $balanceMinor) / 100, 2),
        ];

        $balances = [];
        foreach (['maciek', 'basia'] as $person) {
            $personPaid = (int) round($deposits[$person]['total'] * 100);
            $balances[$person] = [
                'correctionsAssigned' => round($correctionsByPerson[$person] / 100, 2),
                'carryOver'           => round(($person === 'maciek' ? $carryOverMaciek : $carryOverBasia) / 100, 2),
                'paidInPeriod'        => round($personPaid / 100, 2),
            ];
        }

        return [
            'dateFrom'                 => $query->dateFrom,
            'dateTo'                   => $query->dateTo,
            'config'                   => $config->toApiArray(),
            'corrections'              => $corrections,
            'correctionsByPerson'      => [
                'maciek' => round($correctionsByPerson['maciek'] / 100, 2),
                'basia'  => round($correctionsByPerson['basia'] / 100, 2),
            ],
            'unassignedCorrections'    => round($unassignedCorrection / 100, 2),
            'deposits'                 => $deposits,
            'expensesFromCommon'       => $expensesFromCommon,
            'nextDeposit'              => $nextDeposit,
            'balances'                 => $balances,
            'warnings'                 => array_values(array_unique($warnings)),
            'excludedItemsCount'       => $excludedCount,
        ];
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
     * @param array{total: float, items: list<array<string, mixed>>} $corrections
     * @param array{maciek: int, basia: int} $correctionsByPerson
     * @param array<string, array{total: float, count: int}> $expensesFromCommon
     * @param list<string> $warnings
     */
    private function processExpense(
        array $item,
        int $amountMinor,
        int $commonPartyId,
        int $homeBudgetId,
        array $walletOwners,
        array &$corrections,
        array &$correctionsByPerson,
        int &$unassignedCorrection,
        array &$expensesFromCommon,
        int &$excludedCount,
        array &$warnings,
    ): void {
        if ($item['paidFromPartyId'] !== $commonPartyId) {
            return;
        }

        $walletKey = $item['wallet'] ?? '—';
        if (!isset($expensesFromCommon[$walletKey])) {
            $expensesFromCommon[$walletKey] = ['walletId' => $item['walletId'], 'total' => 0.0, 'count' => 0];
        }
        $expensesFromCommon[$walletKey]['total'] += round($amountMinor / 100, 2);
        $expensesFromCommon[$walletKey]['count']++;

        if ($item['walletId'] === null) {
            $excludedCount++;
            $warnings[] = 'Wydatek ze wspólnego bez portfela pozycji — pominięty w korekcie.';
            return;
        }

        if ($item['walletId'] === $homeBudgetId) {
            return;
        }

        $corrections['total'] = round($corrections['total'] + $amountMinor / 100, 2);
        $corrections['items'][] = $this->itemRef($item) + [
            'amount' => round($amountMinor / 100, 2),
            'type'   => 'correction',
        ];

        $walletIdStr = (string) $item['walletId'];
        $owner       = $walletOwners[$walletIdStr] ?? null;
        if ($owner === 'maciek' || $owner === 'basia') {
            $correctionsByPerson[$owner] += $amountMinor;
        } else {
            $unassignedCorrection += $amountMinor;
        }
    }

    /**
     * @param array<string, mixed> $item
     * @param array{maciek: array{total: float, items: list}, basia: array, other: array} $deposits
     * @param list<string> $warnings
     */
    private function processIncome(
        array $item,
        int $amountMinor,
        int $commonPartyId,
        int $homeBudgetId,
        array $maciekSources,
        array $basiaSources,
        array &$deposits,
        int &$excludedCount,
        array &$warnings,
    ): void {
        if ($item['paidToPartyId'] !== $commonPartyId) {
            return;
        }

        $ref = $this->itemRef($item) + ['amount' => round($amountMinor / 100, 2)];

        if ($item['paidFromPartyId'] === null) {
            $excludedCount++;
            $deposits['other']['total'] = round($deposits['other']['total'] + $amountMinor / 100, 2);
            $deposits['other']['items'][] = $ref + ['reason' => 'brak Skąd'];
            $warnings[] = 'Wpływ na konto wspólne bez Skąd — nie liczony jako wpłata rotacyjna.';
            return;
        }

        if ($item['walletId'] === null) {
            $excludedCount++;
            $deposits['other']['total'] = round($deposits['other']['total'] + $amountMinor / 100, 2);
            $deposits['other']['items'][] = $ref + ['reason' => 'brak portfela'];
            return;
        }

        $fromId = $item['paidFromPartyId'];
        $isHome = $item['walletId'] === $homeBudgetId;

        if ($isHome && in_array($fromId, $maciekSources, true)) {
            $deposits['maciek']['total'] = round($deposits['maciek']['total'] + $amountMinor / 100, 2);
            $deposits['maciek']['items'][] = $ref + ['type' => 'standard'];
            return;
        }

        if ($isHome && in_array($fromId, $basiaSources, true)) {
            $deposits['basia']['total'] = round($deposits['basia']['total'] + $amountMinor / 100, 2);
            $deposits['basia']['items'][] = $ref + ['type' => 'standard'];
            return;
        }

        $deposits['other']['total'] = round($deposits['other']['total'] + $amountMinor / 100, 2);
        $deposits['other']['items'][] = $ref + [
            'type'   => 'other',
            'reason' => $isHome ? 'inne Skąd' : 'inny portfel',
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
