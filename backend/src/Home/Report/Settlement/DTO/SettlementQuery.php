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
        public ?string $nextDepositor = null,
        public bool $includePartial = false,
    ) {}

    /** @return self|QueryValidationErrors */
    public static function fromInputBag(InputBag $query): self|QueryValidationErrors
    {
        $hasYearMonth = $query->has('year') || $query->has('month');
        $hasDateRange = $query->has('dateFrom') || $query->has('dateTo');

        if ($hasYearMonth && $hasDateRange) {
            return new QueryValidationErrors([
                'period' => 'Podaj albo year+month, albo dateFrom+dateTo — nie oba naraz.',
            ]);
        }

        if ($hasYearMonth) {
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
            $now      = new \DateTimeImmutable();
            $year     = (int) $now->format('Y');
            $month    = (int) $now->format('m');
            $dateFrom = sprintf('%04d-%02d-01', $year, $month);
            $lastDay  = (int) $now->format('t');
            $dateTo   = sprintf('%04d-%02d-%02d', $year, $month, $lastDay);
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

        return new self($dateFrom, $dateTo, $nextDepositor, $includePartial);
    }
}
