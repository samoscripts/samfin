<?php

namespace App\Home\Report\Settlement\Service;

use App\Home\Report\Settlement\Entity\SettlementConfig;

class SettlementOutlookBuilder
{
    /**
     * @param array<string, array{expenses: array{total: float, items: list}, incomes: array{total: float, items: list}, net: float}> $walletGroups
     *
     * @return array{rotation: array<string, mixed>, personOutlook: array<string, array<string, mixed>>}
     */
    public function build(
        SettlementRotationEngine $engine,
        array $walletGroups,
        int $baseMinor,
        array $walletOwners,
        ?string $asOfDate = null,
    ): array {
        $personOutlook = [];
        foreach ([SettlementConfig::DEPOSITOR_MACIEK, SettlementConfig::DEPOSITOR_BASIA] as $person) {
            $isAnchor = $person === $engine->getAnchor();
            $catchUpMinor = $engine->computeCatchUpMinor($person);
            $walletNetCumulativeMinor = $engine->walletBalanceForPerson($person);
            $prepaidMinor = $person === SettlementConfig::DEPOSITOR_MACIEK
                ? $engine->getRotationPrepaidMaciekMinor()
                : $engine->getRotationPrepaidBasiaMinor();
            $suggestedRawMinor = $engine->computeSuggestedRawForPerson($person);
            $suggestedMinor = max(0, $suggestedRawMinor);

            $entry = [
                'isAnchor'            => $isAnchor,
                'suggestedAmount'     => round($suggestedMinor / 100, 2),
                'suggestedAmountRaw'  => round($suggestedRawMinor / 100, 2),
                'catchUpAmount'       => round($catchUpMinor / 100, 2),
                'walletNetCumulative' => round($walletNetCumulativeMinor / 100, 2),
                'walletNetInPeriod'   => $walletGroups[$person]['net'],
                'rotationPrepaid'     => round($prepaidMinor / 100, 2),
                'formulaSummary'      => SettlementFormulaFormatter::format(
                    $isAnchor,
                    $catchUpMinor,
                    $walletNetCumulativeMinor,
                    $prepaidMinor,
                    $baseMinor,
                    $isAnchor ? $asOfDate : null,
                ),
                'walletBreakdown'     => $this->walletBreakdownForPerson(
                    $engine->getWalletBalancesMinor(),
                    $walletOwners,
                    $person,
                ),
            ];

            if (!$isAnchor) {
                $entry['afterAnchorDepositSimulation'] = $this->buildAfterAnchorDepositSimulation(
                    $engine,
                    $person,
                    $baseMinor,
                    $walletOwners,
                );
            }

            $personOutlook[$person] = $entry;
        }

        $stanMaciek = $engine->stanForPerson(SettlementConfig::DEPOSITOR_MACIEK);
        $rotation = [
            'anchor'               => $engine->getAnchor(),
            'baseAmount'           => round($baseMinor / 100, 2),
            'maciekDepositsTotal'  => round($engine->getMaciekDepositsTotalMinor() / 100, 2),
            'basiaDepositsTotal'   => round($engine->getBasiaDepositsTotalMinor() / 100, 2),
            'stanMaciek'           => round($stanMaciek / 100, 2),
            'stanBasia'            => round(-$stanMaciek / 100, 2),
        ];
        if ($asOfDate !== null) {
            $rotation['asOfDate'] = $asOfDate;
        }

        return [
            'rotation'      => $rotation,
            'personOutlook' => $personOutlook,
        ];
    }

    /**
     * @param array<string, string> $walletOwners
     *
     * @return array<string, mixed>|null
     */
    private function buildAfterAnchorDepositSimulation(
        SettlementRotationEngine $engine,
        string $person,
        int $baseMinor,
        array $walletOwners,
    ): ?array {
        $anchor = $engine->getAnchor();
        if ($person === $anchor) {
            return null;
        }

        $simEngine = SettlementRotationEngine::fromSnapshot(
            $engine->toSnapshot(),
            $baseMinor,
            $walletOwners,
        );

        $anchorPaidMinor = $engine->computeSuggestedForPerson($anchor);
        $simEngine->applyStandardDeposit($anchor, $anchorPaidMinor);

        $catchUpMinor = $simEngine->computeCatchUpMinor($person);
        $walletNetCumulativeMinor = $simEngine->walletBalanceForPerson($person);
        $prepaidMinor = $person === SettlementConfig::DEPOSITOR_MACIEK
            ? $simEngine->getRotationPrepaidMaciekMinor()
            : $simEngine->getRotationPrepaidBasiaMinor();
        $suggestedRawMinor = $simEngine->computeSuggestedRawForPerson($person);
        $suggestedMinor = max(0, $suggestedRawMinor);

        return [
            'anchorPerson'        => $anchor,
            'anchorPaidAmount'    => round($anchorPaidMinor / 100, 2),
            'suggestedAmount'     => round($suggestedMinor / 100, 2),
            'catchUpAmount'       => round($catchUpMinor / 100, 2),
            'walletNetCumulative' => round($walletNetCumulativeMinor / 100, 2),
            'rotationPrepaid'     => round($prepaidMinor / 100, 2),
            'formulaSummary'      => SettlementFormulaFormatter::format(
                true,
                $catchUpMinor,
                $walletNetCumulativeMinor,
                $prepaidMinor,
                $baseMinor,
                null,
            ),
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
}
