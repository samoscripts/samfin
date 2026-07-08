<?php

namespace App\Home\Report\Analytics\DTO;

use App\Home\Report\Shared\DTO\ReportPeriodResolver;
use App\Shared\DTO\QueryParams;
use App\Shared\DTO\QueryValidationErrors;
use Symfony\Component\HttpFoundation\InputBag;

final readonly class AnalyticsQuery
{
    public function __construct(
        public ?string $dateFrom,
        public ?string $dateTo,
        public ?string $walletId = null,
        public ?string $concernId = null,
        public ?string $categoryId = null,
    ) {}

    /** @return self|QueryValidationErrors */
    public static function fromInputBag(InputBag $query): self|QueryValidationErrors
    {
        $period = ReportPeriodResolver::resolve($query);
        if ($period instanceof QueryValidationErrors) {
            return $period;
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
            dateFrom: $period->dateFrom,
            dateTo: $period->dateTo,
            walletId: self::nullableString($query->get('walletId')),
            concernId: self::nullableString($query->get('concernId')),
            categoryId: self::nullableString($query->get('categoryId')),
        );
    }

    public function year(): int
    {
        $anchor = $this->dateFrom ?? $this->dateTo ?? (new \DateTimeImmutable())->format('Y-m-d');

        return (int) substr($anchor, 0, 4);
    }

    public function month(): int
    {
        $anchor = $this->dateFrom ?? $this->dateTo ?? (new \DateTimeImmutable())->format('Y-m-d');

        return (int) substr($anchor, 5, 2);
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
