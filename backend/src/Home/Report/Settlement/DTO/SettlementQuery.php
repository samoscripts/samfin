<?php

namespace App\Home\Report\Settlement\DTO;

use App\Home\Report\Settlement\Entity\SettlementConfig;
use App\Shared\DTO\QueryParams;
use App\Shared\DTO\QueryValidationErrors;
use Symfony\Component\HttpFoundation\InputBag;

final readonly class SettlementQuery
{
    public function __construct(
        public string $dateFrom,
        public string $dateTo,
        public ?int $settlementYear = null,
        public ?string $nextDepositor = null,
        public bool $includePartial = false,
    ) {}

    /** @return self|QueryValidationErrors */
    public static function fromInputBag(InputBag $query): self|QueryValidationErrors
    {
        $hasSettlementYear = $query->has('settlementYear') && $query->get('settlementYear') !== '';
        $hasYearMonth = $query->has('year') || $query->has('month');
        $hasDateRange = $query->has('dateFrom') || $query->has('dateTo');

        $settlementYear = null;
        if ($hasSettlementYear) {
            $parsed = QueryParams::positiveInt($query->get('settlementYear'), 'settlementYear', 0, 2000, 2100);
            if ($parsed instanceof QueryValidationErrors) {
                return $parsed;
            }
            if ($parsed === 0) {
                return new QueryValidationErrors(['settlementYear' => 'Wymagany rok okresu rozliczeniowego.']);
            }
            $settlementYear = $parsed;
        }

        $modeCount = ($hasSettlementYear ? 1 : 0) + ($hasYearMonth ? 1 : 0) + ($hasDateRange ? 1 : 0);
        if ($modeCount > 1) {
            return new QueryValidationErrors([
                'period' => 'Podaj jeden tryb: settlementYear, year+month albo dateFrom+dateTo.',
            ]);
        }

        if ($hasSettlementYear) {
            $dateFrom = sprintf('%04d-01-01', $settlementYear);
            $dateTo   = sprintf('%04d-12-31', $settlementYear);
        } elseif ($hasYearMonth) {
            $now   = new \DateTimeImmutable();
            $year  = $query->has('year')
                ? QueryParams::positiveInt($query->get('year'), 'year', (int) $now->format('Y'), 2000, 2100)
                : (int) $now->format('Y');
            if ($year instanceof QueryValidationErrors) {
                return $year;
            }

            $month = $query->has('month')
                ? QueryParams::positiveInt($query->get('month'), 'month', (int) $now->format('m'), 1, 12)
                : (int) $now->format('m');
            if ($month instanceof QueryValidationErrors) {
                return $month;
            }

            $dateFrom = sprintf('%04d-%02d-01', $year, $month);
            $lastDay  = (int) (new \DateTimeImmutable($dateFrom))->format('t');
            $dateTo   = sprintf('%04d-%02d-%02d', $year, $month, $lastDay);
        } elseif ($hasDateRange) {
            $dateFrom = QueryParams::optionalDate($query->get('dateFrom'), 'dateFrom');
            if ($dateFrom instanceof QueryValidationErrors) {
                return $dateFrom;
            }
            $dateTo = QueryParams::optionalDate($query->get('dateTo'), 'dateTo');
            if ($dateTo instanceof QueryValidationErrors) {
                return $dateTo;
            }

            if ($dateFrom === null || $dateTo === null) {
                return new QueryValidationErrors([
                    'period' => 'Wymagane dateFrom i dateTo albo year i month.',
                ]);
            }

            if ($dateFrom > $dateTo) {
                return new QueryValidationErrors(['dateTo' => 'dateTo nie może być wcześniejsze niż dateFrom.']);
            }
        } else {
            $now = new \DateTimeImmutable();
            $settlementYear = (int) $now->format('Y');
            $dateFrom = sprintf('%04d-01-01', $settlementYear);
            $dateTo   = sprintf('%04d-12-31', $settlementYear);
        }

        $nextDepositor = null;
        if ($query->has('nextDepositor') && $query->get('nextDepositor') !== '') {
            $raw = strtolower((string) $query->get('nextDepositor'));
            if (!in_array($raw, [SettlementConfig::DEPOSITOR_MACIEK, SettlementConfig::DEPOSITOR_BASIA], true)) {
                return new QueryValidationErrors(['nextDepositor' => 'Dozwolone wartości: maciek, basia.']);
            }
            $nextDepositor = $raw;
        }

        $includePartial = filter_var($query->get('includePartial', false), FILTER_VALIDATE_BOOLEAN);

        return new self($dateFrom, $dateTo, $settlementYear, $nextDepositor, $includePartial);
    }
}
