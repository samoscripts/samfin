<?php

declare(strict_types=1);

namespace App\Tests\Unit\Home\Report\Settlement;

use App\Home\Report\Settlement\Service\SettlementItemClassifier;
use PHPUnit\Framework\TestCase;

final class SettlementItemClassifierTest extends TestCase
{
    private SettlementItemClassifier $classifier;

    protected function setUp(): void
    {
        $this->classifier = new SettlementItemClassifier();
    }

    public function testSourceExpenseDepositFromBasiaSource(): void
    {
        $fact = $this->classifier->classifyFact(
            [
                'direction'       => 'EXPENSE',
                'paidFromPartyId' => 20,
                'paidToPartyId'   => 99,
                'walletId'        => 5,
                'amountMinor'     => -60_000,
            ],
            settlementPartyId: 10,
            homeBudgetWalletId: 5,
            maciekSources: [15],
            basiaSources: [20],
            walletOwners: [],
        );

        self::assertNotNull($fact);
        self::assertSame(SettlementItemClassifier::ENTRY_SOURCE_EXP_DEPOSIT, $fact['entryType']);
        self::assertSame('basia', $fact['person']);
        self::assertSame(60_000, $fact['amountMinor']);
        self::assertSame(0, $fact['walletDeltaMinor']);
    }

    public function testSourceExpenseDepositIgnoredWhenPaidFromIsSettlementParty(): void
    {
        $fact = $this->classifier->classifyFact(
            [
                'direction'       => 'EXPENSE',
                'paidFromPartyId' => 10,
                'paidToPartyId'   => 99,
                'walletId'        => 5,
                'amountMinor'     => -60_000,
            ],
            settlementPartyId: 10,
            homeBudgetWalletId: 5,
            maciekSources: [15],
            basiaSources: [20],
            walletOwners: [],
        );

        self::assertNull($fact);
    }

    public function testSourceExpenseDepositIgnoredForPersonalWallet(): void
    {
        $fact = $this->classifier->classifyFact(
            [
                'direction'       => 'EXPENSE',
                'paidFromPartyId' => 20,
                'paidToPartyId'   => 99,
                'walletId'        => 7,
                'amountMinor'     => -60_000,
            ],
            settlementPartyId: 10,
            homeBudgetWalletId: 5,
            maciekSources: [15],
            basiaSources: [20],
            walletOwners: ['7' => 'basia'],
        );

        self::assertNull($fact);
    }
}
