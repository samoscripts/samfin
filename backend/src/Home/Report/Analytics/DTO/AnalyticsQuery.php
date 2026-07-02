<?php

namespace App\Home\Report\Analytics\DTO;

use App\Shared\DTO\QueryParams;
use App\Shared\DTO\QueryValidationErrors;
use Symfony\Component\HttpFoundation\InputBag;

final readonly class AnalyticsQuery
{
    public function __construct(
        public string $dateFrom,
        public string $dateTo,
        public ?string $walletId = null,
        public ?string $concernId = null,
        public ?string $categoryId = null,
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

        foreach (['walletId', 'concernId', 'categoryId'] as $field) {
            if (!$query->has($field)) {
                continue;
            }

            $raw = $query->get($field);
            if ($raw === null || $raw === '') {
                continue;
            }

            $parsed = QueryParams::positiveInt($raw, $field, 0, 1);
            if ($parsed instanceof QueryValidationErrors) {
                return $parsed;
            }
        }

        return new self(
            dateFrom: $dateFrom,
            dateTo: $dateTo,
            walletId: self::nullableString($query->get('walletId')),
            concernId: self::nullableString($query->get('concernId')),
            categoryId: self::nullableString($query->get('categoryId')),
        );
    }

    public function year(): int
    {
        return (int) substr($this->dateFrom, 0, 4);
    }

    public function month(): int
    {
        return (int) substr($this->dateFrom, 5, 2);
    }

    /** @return array<string, mixed> */
    public function toRepositoryFilters(): array
    {
        return array_filter([
            'dateFrom'   => $this->dateFrom,
            'dateTo'     => $this->dateTo,
            'walletId'   => $this->walletId,
            'concernId'  => $this->concernId,
            'categoryId' => $this->categoryId,
        ], static fn (mixed $v) => $v !== null && $v !== '');
    }

    private static function nullableString(mixed $value): ?string
    {
        return QueryParams::nullableString($value);
    }
}
