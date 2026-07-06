<?php

namespace App\Home\Report\Breakdown\DTO;

use App\Home\Report\Shared\DTO\ReportItemFilterCriteria;
use App\Shared\DTO\QueryParams;
use App\Shared\DTO\QueryValidationErrors;
use Symfony\Component\HttpFoundation\InputBag;

final readonly class BreakdownQuery
{
    public const GROUP_BY = ['categoryMain', 'categorySub', 'wallet', 'concern'];
    public const DIRECTIONS = ['EXPENSE', 'INCOME'];

    public function __construct(
        public string $dateFrom,
        public string $dateTo,
        public string $groupBy,
        public string $direction,
        public ReportItemFilterCriteria $filters,
        /** Przy groupBy=categorySub — ID kategorii głównej do drill-down (dzieci). */
        public ?string $subCategoryParentId = null,
    ) {}

    /** @return self|QueryValidationErrors */
    public static function fromInputBag(InputBag $query): self|QueryValidationErrors
    {
        $period = self::resolvePeriod($query);
        if ($period instanceof QueryValidationErrors) {
            return $period;
        }

        $errors = ReportItemFilterCriteria::validateFilters($query);

        $groupBy = QueryParams::enumWithDefault(
            $query->get('groupBy'),
            'groupBy',
            self::GROUP_BY,
            'categoryMain',
        );
        $errors = QueryParams::mergeErrors($errors, $groupBy);

        $direction = QueryParams::enumWithDefault(
            $query->get('reportDirection'),
            'reportDirection',
            self::DIRECTIONS,
            'EXPENSE',
        );
        $errors = QueryParams::mergeErrors($errors, $direction);

        if ($errors !== []) {
            return new QueryValidationErrors($errors);
        }

        [$dateFrom, $dateTo] = $period;

        $filters = ReportItemFilterCriteria::fromInputBag($query, $dateFrom, $dateTo, $direction);
        $subCategoryParentId = null;

        // Dla categorySub `categoryId` oznacza kategorię główną (drill-down do dzieci),
        // a nie zawężenie po ti.category_id — nie może trafić do wspólnego filtra.
        if ($groupBy === 'categorySub' && $filters->categoryId !== null) {
            $subCategoryParentId = $filters->categoryId;
            $filters = new ReportItemFilterCriteria(
                dateFrom: $filters->dateFrom,
                dateTo: $filters->dateTo,
                direction: $filters->direction,
                walletId: $filters->walletId,
                categoryId: null,
                concernId: $filters->concernId,
                paidFromPartyId: $filters->paidFromPartyId,
                paidToPartyId: $filters->paidToPartyId,
                amountMin: $filters->amountMin,
                amountMax: $filters->amountMax,
                description: $filters->description,
            );
        }

        return new self(
            dateFrom: $dateFrom,
            dateTo: $dateTo,
            groupBy: $groupBy,
            direction: $direction,
            filters: $filters,
            subCategoryParentId: $subCategoryParentId,
        );
    }

    /**
     * Okres jak w AnalyticsQuery: year+month ALBO dateFrom+dateTo (wzajemnie wykluczające).
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
                return new QueryValidationErrors([
                    'period' => 'Wymagane dateFrom i dateTo albo year i month.',
                ]);
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
}
