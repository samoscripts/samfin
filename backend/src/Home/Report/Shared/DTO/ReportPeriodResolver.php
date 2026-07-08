<?php

namespace App\Home\Report\Shared\DTO;

use App\Shared\DTO\QueryParams;
use App\Shared\DTO\QueryValidationErrors;
use Symfony\Component\HttpFoundation\InputBag;

final class ReportPeriodResolver
{
    /** @return ReportPeriodResult|QueryValidationErrors */
    public static function resolve(InputBag $query): ReportPeriodResult|QueryValidationErrors
    {
        $hasYearMonth = $query->has('year') || $query->has('month');
        $hasDateRange = $query->has('dateFrom')
            || $query->has('dateTo')
            || $query->get('periodMode') === 'range';

        if ($hasYearMonth && $hasDateRange) {
            return new QueryValidationErrors([
                'period' => 'Podaj albo year+month, albo dateFrom+dateTo — nie oba naraz.',
            ]);
        }

        if ($hasDateRange) {
            $dateFrom = QueryParams::optionalDate($query->get('dateFrom'), 'dateFrom');
            if ($dateFrom instanceof QueryValidationErrors) {
                return $dateFrom;
            }

            $dateTo = QueryParams::optionalDate($query->get('dateTo'), 'dateTo');
            if ($dateTo instanceof QueryValidationErrors) {
                return $dateTo;
            }

            if ($dateFrom !== null && $dateTo !== null && $dateFrom > $dateTo) {
                return new QueryValidationErrors([
                    'dateTo' => 'dateTo nie może być wcześniejsze niż dateFrom.',
                ]);
            }

            return new ReportPeriodResult($dateFrom, $dateTo);
        }

        $now = new \DateTimeImmutable();

        $year = $query->has('year')
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

        return new ReportPeriodResult($dateFrom, $dateTo);
    }
}
