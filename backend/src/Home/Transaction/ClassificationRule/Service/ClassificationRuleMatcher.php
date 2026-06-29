<?php

namespace App\Home\Transaction\ClassificationRule\Service;

use App\Home\Transaction\ClassificationRule\ValueObject\RuleCondition;
use App\Home\Transaction\ClassificationRule\ValueObject\RuleConditionsDefinition;
use App\Home\Transaction\Entity\Transaction;

class ClassificationRuleMatcher
{
    private const FIELD_AMOUNT_MINOR = 'amount_minor';

    public function matches(Transaction $tx, RuleConditionsDefinition $conditions): bool
    {
        foreach ($conditions->conditions as $condition) {
            if (!$this->matchOne($tx, $condition)) {
                return false;
            }
        }

        return true;
    }

    private function matchOne(Transaction $tx, RuleCondition $c): bool
    {
        $actual   = $this->fieldValue($tx, $c->field);
        $isAmount = $c->field === self::FIELD_AMOUNT_MINOR;

        if ($isAmount) {
            $actual = $this->absAmount($actual);
        }

        $expected = $isAmount ? $this->normalizeAmountConditionValue($c->value, $c->operator) : $c->value;

        return match ($c->operator) {
            'equals'           => $this->compareScalar($actual, $expected, $c->caseInsensitive) === 0,
            'not_equals'       => $this->compareScalar($actual, $expected, $c->caseInsensitive) !== 0,
            'contains'         => $this->strContains($actual, $expected, $c->caseInsensitive),
            'not_contains'     => !$this->strContains($actual, $expected, $c->caseInsensitive),
            'starts_with'      => $this->strStartsWith($actual, $expected, $c->caseInsensitive),
            'ends_with'        => $this->strEndsWith($actual, $expected, $c->caseInsensitive),
            'greater_than'     => $this->compareNumeric($actual, $expected) > 0,
            'greater_or_equal' => $this->compareNumeric($actual, $expected) >= 0,
            'less_than'        => $this->compareNumeric($actual, $expected) < 0,
            'less_or_equal'    => $this->compareNumeric($actual, $expected) <= 0,
            'between'          => $this->between($actual, $expected),
            'in'               => $this->inList($actual, $expected, $c->caseInsensitive),
            'not_in'           => !$this->inList($actual, $expected, $c->caseInsensitive),
            'is_empty'         => $actual === null || $actual === '',
            'is_not_empty'     => $actual !== null && $actual !== '',
            default            => false,
        };
    }

    private function fieldValue(Transaction $tx, string $field): mixed
    {
        return match ($field) {
            'trans_description'            => $tx->getTransDescription(),
            'trans_title'                  => $tx->getTransTitle(),
            'counterparty_name'            => $tx->getCounterpartyName(),
            'direction'                    => $tx->getDirection(),
            'amount_minor'                 => $tx->getAmountMinor(),
            'trans_date'                   => $tx->getTransDate()?->format('Y-m-d'),
            'classification_status'          => $tx->getStatus(),
            'counterparty_account_number'  => $tx->getCounterpartyAccountNumber(),
            default                        => null,
        };
    }

    private function normalizeAmountConditionValue(mixed $value, string $operator): mixed
    {
        if ($operator === 'between') {
            if (!is_array($value) || count($value) !== 2) {
                return $value;
            }

            return [$this->absAmount($value[0]), $this->absAmount($value[1])];
        }

        if ($operator === 'in' || $operator === 'not_in') {
            if (!is_array($value)) {
                return $value;
            }

            return array_map(fn (mixed $item) => $this->absAmount($item), $value);
        }

        return $this->absAmount($value);
    }

    private function absAmount(mixed $value): int
    {
        return abs((int) $value);
    }

    private function compareScalar(mixed $actual, mixed $expected, bool $ci): int
    {
        if ($actual === null && $expected === null) {
            return 0;
        }
        if ($actual === null || $expected === null) {
            return $actual <=> $expected;
        }
        if (is_string($actual) && is_string($expected) && $ci) {
            return strcasecmp($actual, $expected);
        }

        return $actual <=> $expected;
    }

    private function compareNumeric(mixed $actual, mixed $expected): int
    {
        return (int) $actual <=> (int) $expected;
    }

    private function strContains(mixed $haystack, mixed $needle, bool $ci): bool
    {
        if (!is_string($haystack) || !is_string($needle)) {
            return false;
        }

        return $ci
            ? str_contains(mb_strtolower($haystack), mb_strtolower($needle))
            : str_contains($haystack, $needle);
    }

    private function strStartsWith(mixed $haystack, mixed $needle, bool $ci): bool
    {
        if (!is_string($haystack) || !is_string($needle)) {
            return false;
        }

        $h = $ci ? mb_strtolower($haystack) : $haystack;
        $n = $ci ? mb_strtolower($needle) : $needle;

        return str_starts_with($h, $n);
    }

    private function strEndsWith(mixed $haystack, mixed $needle, bool $ci): bool
    {
        if (!is_string($haystack) || !is_string($needle)) {
            return false;
        }

        $h = $ci ? mb_strtolower($haystack) : $haystack;
        $n = $ci ? mb_strtolower($needle) : $needle;

        return str_ends_with($h, $n);
    }

    private function between(mixed $actual, mixed $range): bool
    {
        if (!is_array($range) || count($range) !== 2) {
            return false;
        }

        $val = (int) $actual;
        $min = (int) $range[0];
        $max = (int) $range[1];

        return $val >= $min && $val <= $max;
    }

    private function inList(mixed $actual, mixed $list, bool $ci): bool
    {
        if (!is_array($list)) {
            return false;
        }

        foreach ($list as $item) {
            if ($this->compareScalar($actual, $item, $ci) === 0) {
                return true;
            }
        }

        return false;
    }
}
