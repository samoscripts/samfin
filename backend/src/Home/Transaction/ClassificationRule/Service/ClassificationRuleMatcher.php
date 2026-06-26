<?php

namespace App\Home\Transaction\ClassificationRule\Service;

use App\Home\Transaction\ClassificationRule\ValueObject\RuleCondition;
use App\Home\Transaction\ClassificationRule\ValueObject\RuleConditionsDefinition;
use App\Home\Transaction\Entity\Transaction;

class ClassificationRuleMatcher
{
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
        $actual = $this->fieldValue($tx, $c->field);

        return match ($c->operator) {
            'equals'           => $this->compareScalar($actual, $c->value, $c->caseInsensitive) === 0,
            'not_equals'       => $this->compareScalar($actual, $c->value, $c->caseInsensitive) !== 0,
            'contains'         => $this->strContains($actual, $c->value, $c->caseInsensitive),
            'not_contains'     => !$this->strContains($actual, $c->value, $c->caseInsensitive),
            'starts_with'      => $this->strStartsWith($actual, $c->value, $c->caseInsensitive),
            'ends_with'        => $this->strEndsWith($actual, $c->value, $c->caseInsensitive),
            'greater_than'     => $this->compareNumeric($actual, $c->value) > 0,
            'greater_or_equal' => $this->compareNumeric($actual, $c->value) >= 0,
            'less_than'        => $this->compareNumeric($actual, $c->value) < 0,
            'less_or_equal'    => $this->compareNumeric($actual, $c->value) <= 0,
            'between'          => $this->between($actual, $c->value),
            'in'               => $this->inList($actual, $c->value, $c->caseInsensitive),
            'not_in'           => !$this->inList($actual, $c->value, $c->caseInsensitive),
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

        return $val >= (int) $range[0] && $val <= (int) $range[1];
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
