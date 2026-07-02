<?php

namespace App\Tests\Unit\Home\Report\Settlement;

use App\Home\Report\Settlement\Entity\SettlementConfig;
use App\Home\Report\Settlement\Service\SettlementItemClassifier;
use App\Home\Report\Settlement\Service\SettlementRotationEngine;
use PHPUnit\Framework\TestCase;

class SettlementRotationEngineTest extends TestCase
{
    private const BASE = 500_000;

    /** @var array<string, string> */
    private array $maciekWalletOwners = ['20' => 'maciek'];

    /** @var array<string, string> */
    private array $basiaWalletOwners = ['10' => 'basia'];

    public function testGenesisSuggestedEqualsBase(): void
    {
        $engine = new SettlementRotationEngine(self::BASE, [], SettlementConfig::DEPOSITOR_BASIA);

        self::assertSame(SettlementConfig::DEPOSITOR_BASIA, $engine->getAnchor());
        self::assertSame(self::BASE, $engine->computeSuggestedForPerson(SettlementConfig::DEPOSITOR_BASIA));
        self::assertSame(0, $engine->computeSuggestedForPerson(SettlementConfig::DEPOSITOR_MACIEK));
    }

    public function testPhase1FullSequence(): void
    {
        $engine = new SettlementRotationEngine(self::BASE, [], SettlementConfig::DEPOSITOR_BASIA);

        self::assertSame(self::BASE, $engine->computeAnchorSuggested());

        $engine->applyStandardDeposit('basia', 500_000);
        self::assertSame(SettlementConfig::DEPOSITOR_MACIEK, $engine->getAnchor());
        self::assertSame(500_000, $engine->computeAnchorSuggested());

        $engine->applyStandardDeposit('maciek', 500_000);
        self::assertSame(SettlementConfig::DEPOSITOR_BASIA, $engine->getAnchor());
        self::assertSame(500_000, $engine->computeAnchorSuggested());

        $engine->applyStandardDeposit('basia', 500_000);
        self::assertSame(SettlementConfig::DEPOSITOR_MACIEK, $engine->getAnchor());
        self::assertSame(500_000, $engine->computeAnchorSuggested());

        $engine->applyStandardDeposit('maciek', 300_000);
        self::assertSame(SettlementConfig::DEPOSITOR_MACIEK, $engine->getAnchor());
        self::assertSame(200_000, $engine->computeAnchorSuggested());

        $engine->applyStandardDeposit('maciek', 200_000);
        self::assertSame(SettlementConfig::DEPOSITOR_BASIA, $engine->getAnchor());
        self::assertSame(500_000, $engine->computeAnchorSuggested());
    }

    public function testPhase2WithWallets(): void
    {
        $owners = $this->maciekWalletOwners + $this->basiaWalletOwners;
        $engine = new SettlementRotationEngine(self::BASE, $owners, SettlementConfig::DEPOSITOR_BASIA);

        $engine->applyStandardDeposit('basia', 500_000);
        $engine->applyFact([
            'entryType'        => SettlementItemClassifier::ENTRY_WALLET_EXPENSE,
            'person'           => 'maciek',
            'walletId'         => 20,
            'amountMinor'      => 150_000,
            'walletDeltaMinor' => 150_000,
        ]);
        self::assertSame(650_000, $engine->computeAnchorSuggested());

        $engine->applyStandardDeposit('maciek', 650_000);
        self::assertSame(150_000, $engine->computeAnchorSuggested());

        $engine->applyStandardDeposit('basia', 150_000);
        self::assertSame(SettlementConfig::DEPOSITOR_MACIEK, $engine->getAnchor());
        self::assertSame(650_000, $engine->computeAnchorSuggested());

        $engine->applyFact([
            'entryType'        => SettlementItemClassifier::ENTRY_WALLET_EXPENSE,
            'person'           => 'basia',
            'walletId'         => 10,
            'amountMinor'      => 200_000,
            'walletDeltaMinor' => 200_000,
        ]);
        self::assertSame(SettlementConfig::DEPOSITOR_MACIEK, $engine->getAnchor());
        self::assertSame(650_000, $engine->computeAnchorSuggested());

        $engine->applyStandardDeposit('basia', 700_000);
        self::assertSame(850_000, $engine->computeAnchorSuggested());

        $engine->applyFact([
            'entryType'        => SettlementItemClassifier::ENTRY_WALLET_INCOME,
            'person'           => 'maciek',
            'walletId'         => 20,
            'amountMinor'      => 50_000,
            'walletDeltaMinor' => -50_000,
        ]);
        self::assertSame(800_000, $engine->computeAnchorSuggested());

        $engine->applyStandardDeposit('maciek', 800_000);
        self::assertSame(SettlementConfig::DEPOSITOR_BASIA, $engine->getAnchor());
        self::assertSame(300_000, $engine->computeAnchorSuggested());
    }

    public function testWalletFactDoesNotChangeAnchor(): void
    {
        $engine = new SettlementRotationEngine(self::BASE, $this->basiaWalletOwners, SettlementConfig::DEPOSITOR_BASIA);
        $engine->applyStandardDeposit('basia', 500_000);
        $engine->applyStandardDeposit('maciek', 500_000);

        self::assertSame(SettlementConfig::DEPOSITOR_BASIA, $engine->getAnchor());

        $engine->applyFact([
            'entryType'        => SettlementItemClassifier::ENTRY_WALLET_EXPENSE,
            'person'           => 'basia',
            'walletId'         => 10,
            'amountMinor'      => 200_000,
            'walletDeltaMinor' => 200_000,
        ]);

        self::assertSame(SettlementConfig::DEPOSITOR_BASIA, $engine->getAnchor());
        self::assertSame(700_000, $engine->computeAnchorSuggested());
    }

    public function testOverpaymentPhase3(): void
    {
        $engine = new SettlementRotationEngine(self::BASE, [], SettlementConfig::DEPOSITOR_BASIA);

        $engine->applyStandardDeposit('basia', 500_000);
        $engine->applyStandardDeposit('maciek', 500_000);
        $engine->applyStandardDeposit('maciek', 2_000_000);

        self::assertSame(SettlementConfig::DEPOSITOR_BASIA, $engine->getAnchor());
        self::assertSame(2_000_000, $engine->computeAnchorSuggested());

        $engine->applyStandardDeposit('basia', 2_000_000);
        self::assertSame(SettlementConfig::DEPOSITOR_MACIEK, $engine->getAnchor());
        self::assertSame(500_000, $engine->computeAnchorSuggested());
    }

    public function testNonAnchorSuggestedIsWalletOnly(): void
    {
        $engine = new SettlementRotationEngine(self::BASE, $this->basiaWalletOwners, SettlementConfig::DEPOSITOR_BASIA);

        $engine->applyFact([
            'entryType'        => SettlementItemClassifier::ENTRY_WALLET_EXPENSE,
            'person'           => 'basia',
            'walletId'         => 10,
            'amountMinor'      => 200_000,
            'walletDeltaMinor' => 200_000,
        ]);
        $engine->applyStandardDeposit('basia', 500_000);

        self::assertSame(SettlementConfig::DEPOSITOR_MACIEK, $engine->getAnchor());
        self::assertSame(500_000, $engine->computeSuggestedForPerson(SettlementConfig::DEPOSITOR_MACIEK));
        self::assertSame(200_000, $engine->computeSuggestedForPerson(SettlementConfig::DEPOSITOR_BASIA));
    }

    public function testOffQueueDepositUpdatesTotals(): void
    {
        $engine = new SettlementRotationEngine(self::BASE, [], SettlementConfig::DEPOSITOR_MACIEK);

        $engine->applyStandardDeposit('basia', 500_000);

        self::assertSame(SettlementConfig::DEPOSITOR_MACIEK, $engine->getAnchor());
        self::assertSame(500_000, $engine->computeAnchorSuggested());
    }

    public function testFromLedgerRowRestoresState(): void
    {
        $engine = new SettlementRotationEngine(self::BASE, [], SettlementConfig::DEPOSITOR_BASIA);
        $engine->applyStandardDeposit('basia', 500_000);
        $engine->applyStandardDeposit('maciek', 300_000);
        $snapshot = $engine->toSnapshot();

        $restored = SettlementRotationEngine::fromLedgerRow(
            [
                'wallet_balances_json'          => $snapshot['walletBalancesMinor'],
                'maciek_deposits_total_minor'   => $snapshot['maciekDepositsTotalMinor'],
                'basia_deposits_total_minor'    => $snapshot['basiaDepositsTotalMinor'],
                'anchor'                        => $snapshot['anchor'],
                'rotation_prepaid_maciek_minor' => 0,
                'rotation_prepaid_basia_minor'  => 0,
            ],
            self::BASE,
            [],
        );

        self::assertSame($engine->getAnchor(), $restored->getAnchor());
        self::assertSame($engine->computeAnchorSuggested(), $restored->computeAnchorSuggested());
        self::assertSame(200_000, $restored->computeAnchorSuggested());
    }
}
