<?php

namespace App\Home\Report\Shared\DTO;

use App\Shared\DTO\QueryParams;
use Symfony\Component\HttpFoundation\InputBag;

/**
 * Wspólne filtry zawężające pozycje transakcji (transaction_items) dla raportów
 * Rozbicie i Trend. Okres (dateFrom/dateTo) i kierunek rozstrzygają nadrzędne DTO
 * (BreakdownQuery / TrendQuery); tutaj trzymamy filtry „jak lista transakcji”.
 */
final readonly class ReportItemFilterCriteria
{
    /**
     * @param list<string>|null $directions Gdy ustawione — filtr `t.direction IN (...)` (Rozbicie).
     */
    public function __construct(
        public ?string $dateFrom,
        public ?string $dateTo,
        public ?string $direction = null,
        public ?array $directions = null,
        public ?string $walletId = null,
        public ?string $categoryId = null,
        public ?string $concernId = null,
        public ?string $paidFromPartyId = null,
        public ?string $paidToPartyId = null,
        public ?string $amountMin = null,
        public ?string $amountMax = null,
        public ?string $description = null,
    ) {}

    /**
     * Waliduje wyłącznie filtry zawężające (bez okresu — ten należy do nadrzędnego DTO).
     *
     * @return array<string, string> mapa błędów pól (pusta = brak błędów)
     */
    public static function validateFilters(InputBag $query): array
    {
        $errors = [];

        foreach (['walletId', 'categoryId', 'concernId', 'paidFromPartyId', 'paidToPartyId'] as $field) {
            if (!$query->has($field)) {
                continue;
            }
            $raw = $query->get($field);
            if ($raw === null || $raw === '') {
                continue;
            }
            $parsed = QueryParams::positiveInt($raw, $field, 0, 1);
            $errors = QueryParams::mergeErrors($errors, $parsed);
        }

        foreach (['amountMin', 'amountMax'] as $field) {
            if (!$query->has($field)) {
                continue;
            }
            $raw = $query->get($field);
            if ($raw === null || $raw === '') {
                continue;
            }
            if (!is_numeric(str_replace(',', '.', (string) $raw))) {
                $errors[$field] = 'Oczekiwana wartość liczbowa.';
            }
        }

        return $errors;
    }

    public static function fromInputBag(
        InputBag $query,
        ?string $dateFrom,
        ?string $dateTo,
        ?string $direction,
        ?array $directions = null,
    ): self {
        return new self(
            dateFrom: $dateFrom,
            dateTo: $dateTo,
            direction: $direction,
            directions: $directions,
            walletId: QueryParams::nullableString($query->get('walletId')),
            categoryId: QueryParams::nullableString($query->get('categoryId')),
            concernId: QueryParams::nullableString($query->get('concernId')),
            paidFromPartyId: QueryParams::nullableString($query->get('paidFromPartyId')),
            paidToPartyId: QueryParams::nullableString($query->get('paidToPartyId')),
            amountMin: QueryParams::nullableString($query->get('amountMin')),
            amountMax: QueryParams::nullableString($query->get('amountMax')),
            description: QueryParams::nullableString($query->get('description')),
        );
    }
}
