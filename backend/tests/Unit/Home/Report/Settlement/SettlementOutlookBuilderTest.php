<?php

declare(strict_types=1);

namespace App\Tests\Unit\Home\Report\Settlement;

use App\Home\Report\Settlement\Entity\SettlementConfig;
use App\Home\Report\Settlement\Service\SettlementOutlookBuilder;
use App\Home\Report\Settlement\Service\SettlementRotationEngine;
use PHPUnit\Framework\TestCase;

final class SettlementOutlookBuilderTest extends TestCase
{
    private SettlementOutlookBuilder $builder;

    protected function setUp(): void
    {
        $this->builder = new SettlementOutlookBuilder();
    }

    public function testAfterAnchorDepositSimulationForNonAnchor(): void
    {
        $baseMinor = 500_000;
        $walletOwners = [];

        $engine = new SettlementRotationEngine(
            $baseMinor,
            $walletOwners,
            SettlementConfig::DEPOSITOR_MACIEK,
        );
        $engine->applyStandardDeposit(SettlementConfig::DEPOSITOR_BASIA, 800_000);

        $walletGroups = $this->emptyWalletGroups();

        $result = $this->builder->build($engine, $walletGroups, $baseMinor, $walletOwners);
        $maciek = $result['personOutlook']['maciek'];
        $basia = $result['personOutlook']['basia'];

        self::assertTrue($maciek['isAnchor']);
        self::assertArrayNotHasKey('afterAnchorDepositSimulation', $maciek);

        self::assertFalse($basia['isAnchor']);
        self::assertArrayHasKey('afterAnchorDepositSimulation', $basia);

        $sim = $basia['afterAnchorDepositSimulation'];
        self::assertSame('maciek', $sim['anchorPerson']);
        self::assertSame(8000.0, $sim['anchorPaidAmount']);
        self::assertSame(5000.0, $sim['suggestedAmount']);
        self::assertSame(5000.0, $sim['catchUpAmount']);
    }

    /**
     * @return array<string, array{expenses: array{total: float, items: list}, incomes: array{total: float, items: list}, net: float}>
     */
    private function emptyWalletGroups(): array
    {
        $empty = ['expenses' => ['total' => 0.0, 'items' => []], 'incomes' => ['total' => 0.0, 'items' => []], 'net' => 0.0];

        return [
            'maciek' => $empty,
            'basia'  => $empty,
            'other'  => $empty,
        ];
    }
}
