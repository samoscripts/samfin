<?php

namespace App\Home\Report\Analytics\DTO;

use App\Shared\DTO\QueryParams;
use App\Shared\DTO\QueryValidationErrors;
use Symfony\Component\HttpFoundation\InputBag;

final readonly class AnalyticsQuery
{
    public function __construct(
        public int $year,
        public int $month,
        public ?string $walletId = null,
        public ?string $concernId = null,
        public ?string $categoryId = null,
    ) {}

    /** @return self|QueryValidationErrors */
    public static function fromInputBag(InputBag $query): self|QueryValidationErrors
    {
        $now    = new \DateTimeImmutable();
        $errors = [];

        $year = $query->has('year')
            ? QueryParams::positiveInt($query->get('year'), 'year', (int) $now->format('Y'), 2000, 2100)
            : (int) $now->format('Y');
        $errors = QueryParams::mergeErrors($errors, $year);

        $month = $query->has('month')
            ? QueryParams::positiveInt($query->get('month'), 'month', (int) $now->format('m'), 1, 12)
            : (int) $now->format('m');
        $errors = QueryParams::mergeErrors($errors, $month);

        if ($errors !== []) {
            return new QueryValidationErrors($errors);
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
            year: $year,
            month: $month,
            walletId: self::nullableString($query->get('walletId')),
            concernId: self::nullableString($query->get('concernId')),
            categoryId: self::nullableString($query->get('categoryId')),
        );
    }

    public function dateFrom(): string
    {
        return sprintf('%04d-%02d-01', $this->year, $this->month);
    }

    public function dateTo(): string
    {
        $lastDay = (int) (new \DateTimeImmutable($this->dateFrom()))->format('t');

        return sprintf('%04d-%02d-%02d', $this->year, $this->month, $lastDay);
    }

    /** @return array<string, mixed> */
    public function toRepositoryFilters(): array
    {
        return array_filter([
            'dateFrom'   => $this->dateFrom(),
            'dateTo'     => $this->dateTo(),
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
