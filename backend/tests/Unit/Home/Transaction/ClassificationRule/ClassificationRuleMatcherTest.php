<?php

declare(strict_types=1);

namespace App\Tests\Unit\Home\Transaction\ClassificationRule;

use App\Home\Transaction\ClassificationRule\Service\ClassificationRuleMatcher;
use App\Home\Transaction\ClassificationRule\ValueObject\RuleCondition;
use App\Home\Transaction\ClassificationRule\ValueObject\RuleConditionsDefinition;
use App\Home\Transaction\Entity\Transaction;
use PHPUnit\Framework\TestCase;

final class ClassificationRuleMatcherTest extends TestCase
{
    private ClassificationRuleMatcher $matcher;

    protected function setUp(): void
    {
        $this->matcher = new ClassificationRuleMatcher();
    }

    public function testExpenseEqualsMatchesPositiveConditionValue(): void
    {
        $tx = $this->transaction(Transaction::DIRECTION_EXPENSE, -80_000);

        self::assertTrue($this->matcherMatches($tx, [
            new RuleCondition('direction', 'equals', Transaction::DIRECTION_EXPENSE),
            new RuleCondition('amount_minor', 'equals', 80_000),
        ]));
    }

    public function testIncomeEqualsMatchesPositiveConditionValue(): void
    {
        $tx = $this->transaction(Transaction::DIRECTION_INCOME, 80_000);

        self::assertTrue($this->matcherMatches($tx, [
            new RuleCondition('direction', 'equals', Transaction::DIRECTION_INCOME),
            new RuleCondition('amount_minor', 'equals', 80_000),
        ]));
    }

    public function testExpenseBetweenOutsideRangeDoesNotMatch(): void
    {
        $tx = $this->transaction(Transaction::DIRECTION_EXPENSE, -30_000);

        self::assertFalse($this->matcherMatches($tx, [
            new RuleCondition('direction', 'equals', Transaction::DIRECTION_EXPENSE),
            new RuleCondition('amount_minor', 'between', [2_156, 4_515]),
        ]));
    }

    public function testExpenseBetweenInsideRangeMatches(): void
    {
        $tx = $this->transaction(Transaction::DIRECTION_EXPENSE, -35_000);

        self::assertTrue($this->matcherMatches($tx, [
            new RuleCondition('direction', 'equals', Transaction::DIRECTION_EXPENSE),
            new RuleCondition('amount_minor', 'between', [30_000, 40_000]),
        ]));
    }

    public function testLegacyNegativeConditionValueStillMatches(): void
    {
        $tx = $this->transaction(Transaction::DIRECTION_EXPENSE, -80_000);

        self::assertTrue($this->matcherMatches($tx, [
            new RuleCondition('direction', 'equals', Transaction::DIRECTION_EXPENSE),
            new RuleCondition('amount_minor', 'equals', -80_000),
        ]));
    }

    public function testInListMatchesAbsoluteAmount(): void
    {
        $tx = $this->transaction(Transaction::DIRECTION_EXPENSE, -2_156);

        self::assertTrue($this->matcherMatches($tx, [
            new RuleCondition('direction', 'equals', Transaction::DIRECTION_EXPENSE),
            new RuleCondition('amount_minor', 'in', [2_156, 5_000]),
        ]));
    }

    /** @param RuleCondition[] $conditions */
    private function matcherMatches(Transaction $tx, array $conditions): bool
    {
        return $this->matcher->matches($tx, new RuleConditionsDefinition($conditions));
    }

    private function transaction(string $direction, int $amountMinor): Transaction
    {
        $tx = new Transaction();
        $tx->setDirection($direction);
        $tx->setAmountMinor($amountMinor);

        return $tx;
    }
}
