<?php

declare(strict_types=1);

namespace App\Tests\Unit\Home\Report\Settlement;

use App\Home\Report\Settlement\Entity\SettlementConfig;
use App\Home\Report\Settlement\Service\SettlementItemClassifier;
use App\Home\Report\Settlement\Service\SettlementRotationEngine;
use PHPUnit\Framework\TestCase;

final class SettlementRotationEngineTest extends TestCase
{
    public function testSourceExpenseDepositShiftsAnchorAndSuggestedAfterCatchUpDeposit(): void
    {
        $baseMinor = 500_000;
        $engine = new SettlementRotationEngine(
            $baseMinor,
            [],
            SettlementConfig::DEPOSITOR_BASIA,
        );

        $engine->applyStandardDeposit(SettlementConfig::DEPOSITOR_MACIEK, 1_000_000);
        $engine->applyStandardDeposit(SettlementConfig::DEPOSITOR_BASIA, 1_000_000);
        self::assertSame(SettlementConfig::DEPOSITOR_MACIEK, $engine->getAnchor());
        self::assertSame(500_000, $engine->computeSuggestedForPerson(SettlementConfig::DEPOSITOR_MACIEK));

        $engine->applyFact([
            'entryType'   => SettlementItemClassifier::ENTRY_SOURCE_EXP_DEPOSIT,
            'person'      => SettlementConfig::DEPOSITOR_BASIA,
            'walletId'    => 5,
            'amountMinor' => 60_000,
        ]);

        self::assertSame(SettlementConfig::DEPOSITOR_MACIEK, $engine->getAnchor());
        self::assertSame(60_000, $engine->computeSuggestedForPerson(SettlementConfig::DEPOSITOR_MACIEK));

        $engine->applyStandardDeposit(SettlementConfig::DEPOSITOR_MACIEK, 500_000);

        self::assertSame(SettlementConfig::DEPOSITOR_BASIA, $engine->getAnchor());
        self::assertSame(440_000, $engine->computeSuggestedForPerson(SettlementConfig::DEPOSITOR_BASIA));
    }
}
