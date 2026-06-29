<?php

declare(strict_types=1);

namespace App\Tests\Unit\Home\Transaction\ClassificationRule;

use App\Home\Transaction\ClassificationRule\Service\ClassificationRuleConditionsNormalizer;
use PHPUnit\Framework\TestCase;

final class ClassificationRuleConditionsNormalizerTest extends TestCase
{
    private ClassificationRuleConditionsNormalizer $normalizer;

    protected function setUp(): void
    {
        $this->normalizer = new ClassificationRuleConditionsNormalizer();
    }

    public function testNormalizeAmountConditionToAbsoluteMinor(): void
    {
        $result = $this->normalizer->normalize([
            'conditions' => [
                [
                    'field'    => 'direction',
                    'operator' => 'equals',
                    'value'    => 'EXPENSE',
                ],
                [
                    'field'    => 'amount_minor',
                    'operator' => 'equals',
                    'value'    => -80_000,
                ],
                [
                    'field'    => 'amount_minor',
                    'operator' => 'between',
                    'value'    => [-30_000, 40_000],
                ],
                [
                    'field'    => 'amount_minor',
                    'operator' => 'in',
                    'value'    => [-2_156, 5_000],
                ],
            ],
        ]);

        $conditions = $result['conditions'];
        self::assertSame(80_000, $conditions[1]['value']);
        self::assertSame([30_000, 40_000], $conditions[2]['value']);
        self::assertSame([2_156, 5_000], $conditions[3]['value']);
    }
}
