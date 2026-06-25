<?php

namespace App\Tests\Unit\Home\Report\Settlement;

use App\Home\Report\Settlement\Entity\SettlementConfig;
use App\Home\Report\Settlement\Service\SettlementBalanceEngine;
use App\Home\Report\Settlement\Service\SettlementItemClassifier;
use PHPUnit\Framework\TestCase;

class SettlementBalanceEngineTest extends TestCase
{
    private const BASE = 500_000;

    /** @var array<string, string> */
    private array $owners = ['10' => 'basia'];

    public function testChairThenSplitPaymentMaciekSuggested3000(): void
    {
        $engine = new SettlementBalanceEngine(self::BASE, $this->owners, SettlementConfig::DEPOSITOR_BASIA);

        $engine->applyFact([
            'entryType'        => SettlementItemClassifier::ENTRY_WALLET_EXPENSE,
            'person'           => 'basia',
            'walletId'         => 10,
            'amountMinor'      => 200_000,
            'walletDeltaMinor' => 200_000,
        ]);

        self::assertSame(700_000, $engine->computeSuggested());

        $engine->applyFact([
            'entryType'   => SettlementItemClassifier::ENTRY_STANDARD_DEPOSIT,
            'person'      => 'basia',
            'amountMinor' => 300_000,
        ]);

        self::assertSame(200_000, $engine->getRotationCarryMinor());
        self::assertSame(SettlementConfig::DEPOSITOR_MACIEK, $engine->getNextDepositor());

        $engine->applyFact([
            'entryType'        => SettlementItemClassifier::ENTRY_WALLET_INCOME,
            'person'           => 'basia',
            'walletId'         => 10,
            'amountMinor'      => 200_000,
            'walletDeltaMinor' => -200_000,
        ]);

        self::assertSame(300_000, $engine->computeSuggested());
    }

    public function testOverpaymentSequenceModelA(): void
    {
        $engine = new SettlementBalanceEngine(self::BASE, [], SettlementConfig::DEPOSITOR_BASIA);

        $engine->applyStandardDeposit('basia', 800_000);
        self::assertSame(-300_000, $engine->getRotationCarryMinor());
        self::assertSame(800_000, $engine->computeSuggested());

        $engine->applyStandardDeposit('maciek', 500_000);
        self::assertSame(0, $engine->getRotationCarryMinor());
        self::assertSame(500_000, $engine->computeSuggested());

        $engine->applyStandardDeposit('basia', 300_000);
        self::assertSame(200_000, $engine->getRotationCarryMinor());
        self::assertSame(300_000, $engine->computeSuggested());
    }
}
