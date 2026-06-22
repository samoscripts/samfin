<?php

namespace App\Home\Transaction\DTO;

use App\Shared\DTO\QueryParams;
use App\Shared\DTO\QueryValidationErrors;
use Symfony\Component\HttpFoundation\InputBag;

final readonly class TransactionStatsQuery
{
    public function __construct(
        public ?string $dateFrom = null,
        public ?string $dateTo = null,
    ) {}

    /** @return self|QueryValidationErrors */
    public static function fromInputBag(InputBag $query): self|QueryValidationErrors
    {
        $errors = [];

        $monthRaw = QueryParams::nullableString($query->get('month'));
        $dateFrom = null;
        $dateTo   = null;

        if ($monthRaw !== null) {
            $expanded = QueryParams::expandMonth($monthRaw);
            if ($expanded instanceof QueryValidationErrors) {
                return $expanded;
            }
            $dateFrom = $expanded['dateFrom'];
            $dateTo   = $expanded['dateTo'];
        }

        if ($query->has('dateFrom')) {
            $parsed = QueryParams::optionalDate($query->get('dateFrom'), 'dateFrom');
            $errors = QueryParams::mergeErrors($errors, $parsed);
            if (!QueryParams::isError($parsed) && $parsed !== null) {
                $dateFrom = $parsed;
            }
        }

        if ($query->has('dateTo')) {
            $parsed = QueryParams::optionalDate($query->get('dateTo'), 'dateTo');
            $errors = QueryParams::mergeErrors($errors, $parsed);
            if (!QueryParams::isError($parsed) && $parsed !== null) {
                $dateTo = $parsed;
            }
        }

        if ($errors !== []) {
            return new QueryValidationErrors($errors);
        }

        return new self($dateFrom, $dateTo);
    }

    /** @return array<string, string> */
    public function toRepositoryFilters(): array
    {
        return array_filter([
            'dateFrom' => $this->dateFrom,
            'dateTo'   => $this->dateTo,
        ], static fn (mixed $v) => $v !== null && $v !== '');
    }
}
