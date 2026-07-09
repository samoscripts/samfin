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

    /**
     * @param list<string> $directions
     */
    public function __construct(
        public ?string $dateFrom,
        public ?string $dateTo,
        public string $groupBy,
        public array $directions,
        public ReportItemFilterCriteria $filters,
        /** Przy groupBy=categorySub — ID kategorii głównej do drill-down (dzieci). */
        public ?string $subCategoryParentId = null,
    ) {}

    public function hasBothDirections(): bool
    {
        return in_array('EXPENSE', $this->directions, true)
            && in_array('INCOME', $this->directions, true);
    }

    /** Echo pojedynczego kierunku dla wstecznej kompatybilności odpowiedzi API. */
    public function legacyDirection(): string
    {
        return $this->directions[0] ?? 'EXPENSE';
    }

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

        $directions = self::resolveDirections($query);
        if ($directions instanceof QueryValidationErrors) {
            return $directions;
        }

        if ($errors !== []) {
            return new QueryValidationErrors($errors);
        }

        $filters = ReportItemFilterCriteria::fromInputBag(
            $query,
            $period->dateFrom,
            $period->dateTo,
            null,
            $directions,
        );
        $subCategoryParentId = null;

        if ($groupBy === 'categorySub' && $filters->categoryId !== null) {
            $subCategoryParentId = $filters->categoryId;
            $filters = new ReportItemFilterCriteria(
                dateFrom: $filters->dateFrom,
                dateTo: $filters->dateTo,
                direction: null,
                directions: $filters->directions,
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
            directions: $directions,
            filters: $filters,
            subCategoryParentId: $subCategoryParentId,
        );
    }

    /**
     * @return list<string>|QueryValidationErrors
     */
    private static function resolveDirections(InputBag $query): array|QueryValidationErrors
    {
        if ($query->has('reportDirections') && $query->get('reportDirections') !== null && $query->get('reportDirections') !== '') {
            $raw = self::parseStringList($query->get('reportDirections'));
            foreach ($raw as $token) {
                if (!in_array($token, self::DIRECTIONS, true)) {
                    return new QueryValidationErrors([
                        'reportDirections' => 'Dozwolone wartości: EXPENSE, INCOME.',
                    ]);
                }
            }

            return $raw !== [] ? $raw : ['EXPENSE'];
        }

        $direction = QueryParams::enumWithDefault(
            $query->get('reportDirection'),
            'reportDirection',
            self::DIRECTIONS,
            'EXPENSE',
        );
        if ($direction instanceof QueryValidationErrors) {
            return $direction;
        }

        return [$direction];
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
}
