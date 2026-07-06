<?php

namespace App\Home\Report\Trend\DTO;

use App\Home\Report\Shared\DTO\ReportItemFilterCriteria;
use App\Shared\DTO\QueryParams;
use App\Shared\DTO\QueryValidationErrors;
use Symfony\Component\HttpFoundation\InputBag;

final readonly class TrendQuery
{
    public const SERIES_BY = ['none', 'description', 'category', 'wallet', 'concern'];
    public const GRANULARITY = ['month', 'quarter', 'year'];
    public const DIRECTIONS = ['EXPENSE', 'INCOME'];

    /**
     * @param list<string> $terms
     * @param list<int>    $categoryIds
     * @param list<int>    $walletIds
     * @param list<int>    $concernIds
     * @param list<string> $directions
     */
    public function __construct(
        public string $dateFrom,
        public string $dateTo,
        public string $seriesBy,
        public string $granularity,
        public array $terms,
        public array $categoryIds,
        public array $walletIds,
        public array $concernIds,
        public array $directions,
        public ReportItemFilterCriteria $narrow,
    ) {}

    /** @return self|QueryValidationErrors */
    public static function fromInputBag(InputBag $query): self|QueryValidationErrors
    {
        $period = self::resolvePeriod($query);
        if ($period instanceof QueryValidationErrors) {
            return $period;
        }

        $errors = ReportItemFilterCriteria::validateFilters($query);

        $seriesBy = QueryParams::enumWithDefault($query->get('trendSeriesBy'), 'trendSeriesBy', self::SERIES_BY, 'none');
        $errors   = QueryParams::mergeErrors($errors, $seriesBy);

        $granularity = QueryParams::enumWithDefault($query->get('trendGranularity'), 'trendGranularity', self::GRANULARITY, 'month');
        $errors      = QueryParams::mergeErrors($errors, $granularity);

        $directions = self::parseDirections($query->get('trendDirections'));

        if ($errors !== []) {
            return new QueryValidationErrors($errors);
        }

        [$dateFrom, $dateTo] = $period;

        return new self(
            dateFrom: $dateFrom,
            dateTo: $dateTo,
            seriesBy: $seriesBy,
            granularity: $granularity,
            terms: self::parseStringList($query->get('trendTerms')),
            categoryIds: self::parseIntList($query->get('trendCategoryIds')),
            walletIds: self::parseIntList($query->get('trendWalletIds')),
            concernIds: self::parseIntList($query->get('trendConcernIds')),
            directions: $directions,
            narrow: ReportItemFilterCriteria::fromInputBag($query, $dateFrom, $dateTo, null),
        );
    }

    /**
     * Okres jak w AnalyticsQuery: year+month ALBO dateFrom+dateTo.
     *
     * @return array{0: string, 1: string}|QueryValidationErrors
     */
    private static function resolvePeriod(InputBag $query): array|QueryValidationErrors
    {
        $hasYearMonth = $query->has('year') || $query->has('month');
        $hasDateRange = $query->has('dateFrom') || $query->has('dateTo');

        if ($hasYearMonth && $hasDateRange) {
            return new QueryValidationErrors([
                'period' => 'Podaj albo year+month, albo dateFrom+dateTo — nie oba naraz.',
            ]);
        }

        $now = new \DateTimeImmutable();

        if ($hasDateRange) {
            $dateFrom = QueryParams::optionalDate($query->get('dateFrom'), 'dateFrom');
            if ($dateFrom instanceof QueryValidationErrors) {
                return $dateFrom;
            }
            $dateTo = QueryParams::optionalDate($query->get('dateTo'), 'dateTo');
            if ($dateTo instanceof QueryValidationErrors) {
                return $dateTo;
            }
            if ($dateFrom === null || $dateTo === null) {
                return new QueryValidationErrors(['period' => 'Wymagane dateFrom i dateTo albo year i month.']);
            }
            if ($dateFrom > $dateTo) {
                return new QueryValidationErrors(['dateTo' => 'dateTo nie może być wcześniejsze niż dateFrom.']);
            }

            return [$dateFrom, $dateTo];
        }

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

        return [$dateFrom, $dateTo];
    }

    /** @return list<string> */
    private static function parseDirections(mixed $raw): array
    {
        $list = array_values(array_filter(
            self::parseStringList($raw),
            static fn (string $d) => in_array($d, self::DIRECTIONS, true),
        ));

        return $list !== [] ? $list : ['EXPENSE'];
    }

    /** @return list<string> */
    private static function parseStringList(mixed $raw): array
    {
        if ($raw === null || $raw === '') {
            return [];
        }

        return array_values(array_filter(
            array_map('trim', explode(',', (string) $raw)),
            static fn (string $v) => $v !== '',
        ));
    }

    /** @return list<int> */
    private static function parseIntList(mixed $raw): array
    {
        return array_values(array_map(
            static fn (string $v) => (int) $v,
            array_filter(self::parseStringList($raw), static fn (string $v) => is_numeric($v)),
        ));
    }
}
