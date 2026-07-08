<?php

namespace App\Home\Report\Breakdown\DTO;

use App\Home\Report\Shared\DTO\ReportItemFilterCriteria;
use App\Home\Report\Shared\DTO\ReportPeriodResolver;
use App\Shared\DTO\QueryParams;
use App\Shared\DTO\QueryValidationErrors;
use Symfony\Component\HttpFoundation\InputBag;

final readonly class BreakdownQuery
{
    public const GROUP_BY = ['categoryMain', 'categorySub', 'wallet', 'concern'];
    public const DIRECTIONS = ['EXPENSE', 'INCOME'];

    public function __construct(
        public ?string $dateFrom,
        public ?string $dateTo,
        public string $groupBy,
        public string $direction,
        public ReportItemFilterCriteria $filters,
        /** Przy groupBy=categorySub — ID kategorii głównej do drill-down (dzieci). */
        public ?string $subCategoryParentId = null,
    ) {}

    /** @return self|QueryValidationErrors */
    public static function fromInputBag(InputBag $query): self|QueryValidationErrors
    {
        $period = ReportPeriodResolver::resolve($query);
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

        $filters = ReportItemFilterCriteria::fromInputBag(
            $query,
            $period->dateFrom,
            $period->dateTo,
            $direction,
        );
        $subCategoryParentId = null;

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
            dateFrom: $period->dateFrom,
            dateTo: $period->dateTo,
            groupBy: $groupBy,
            direction: $direction,
            filters: $filters,
            subCategoryParentId: $subCategoryParentId,
        );
    }
}
