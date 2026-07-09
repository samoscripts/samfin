<?php

namespace App\Home\Transaction\FilterSaved\DTO;

use App\Home\Transaction\DTO\TransactionFilterCriteria;
use App\Shared\DTO\QueryParams;
use App\Shared\DTO\QueryValidationErrors;
use Symfony\Component\HttpFoundation\InputBag;

final readonly class TransactionFilterSavedParams
{
    private const ALLOWED_SORT_FIELDS = ['date', 'amount'];
    private const ALLOWED_SORT_DIRS = ['asc', 'desc'];
    private const MIN_PER_PAGE = 1;
    private const MAX_PER_PAGE = 100;

    /** @param array<string, mixed> $filters */
    public function __construct(
        public array $filters,
        public string $sortField,
        public string $sortDir,
        public int $perPage,
    ) {}

    /** @return self|QueryValidationErrors */
    public static function fromArray(array $data): self|QueryValidationErrors
    {
        $errors = [];

        if (!array_key_exists('filters', $data) || !is_array($data['filters'])) {
            $errors['filters'] = 'Pole filters jest wymagane i musi być obiektem.';
        }

        if (!array_key_exists('sort', $data) || !is_array($data['sort'])) {
            $errors['sort'] = 'Pole sort jest wymagane i musi być obiektem.';
        }

        if (!array_key_exists('perPage', $data)) {
            $errors['perPage'] = 'Pole perPage jest wymagane.';
        }

        if ($errors !== []) {
            return new QueryValidationErrors($errors);
        }

        /** @var array<string, mixed> $filtersRaw */
        $filtersRaw = $data['filters'];
        $filterErrors = self::validateFilters($filtersRaw);
        if ($filterErrors instanceof QueryValidationErrors) {
            $errors = QueryParams::mergeErrors($errors, $filterErrors);
        }

        /** @var array<string, mixed> $sortRaw */
        $sortRaw = $data['sort'];
        $sortField = is_string($sortRaw['field'] ?? null) ? trim($sortRaw['field']) : '';
        if (!in_array($sortField, self::ALLOWED_SORT_FIELDS, true)) {
            $errors['sort.field'] = 'Niedozwolone pole sortowania.';
        }

        $sortDir = is_string($sortRaw['direction'] ?? null) ? strtolower(trim($sortRaw['direction'])) : '';
        if (!in_array($sortDir, self::ALLOWED_SORT_DIRS, true)) {
            $errors['sort.direction'] = 'Niedozwolony kierunek sortowania.';
        }

        if (!is_int($data['perPage']) && !(is_string($data['perPage']) && ctype_digit($data['perPage']))) {
            $errors['perPage'] = 'Pole perPage musi być liczbą całkowitą.';
        } else {
            $perPage = (int) $data['perPage'];
            if ($perPage < self::MIN_PER_PAGE || $perPage > self::MAX_PER_PAGE) {
                $errors['perPage'] = sprintf(
                    'Pole perPage musi być w zakresie %d–%d.',
                    self::MIN_PER_PAGE,
                    self::MAX_PER_PAGE,
                );
            }
        }

        if ($errors !== []) {
            return new QueryValidationErrors($errors);
        }

        return new self(
            filters: self::normalizeFilters($filtersRaw),
            sortField: $sortField,
            sortDir: $sortDir,
            perPage: (int) $data['perPage'],
        );
    }

    /** @return array<string, mixed> */
    public function toStorageArray(): array
    {
        return [
            'filters'  => $this->filters,
            'sort'     => [
                'field'     => $this->sortField,
                'direction' => $this->sortDir,
            ],
            'perPage'  => $this->perPage,
        ];
    }

    /** @param array<string, mixed> $filtersRaw */
    private static function validateFilters(array $filtersRaw): QueryValidationErrors|true
    {
        $bag = new InputBag(self::filtersToQueryBag($filtersRaw));

        return TransactionFilterCriteria::validateFromInputBag($bag);
    }

    /** @param array<string, mixed> $filtersRaw */
    private static function normalizeFilters(array $filtersRaw): array
    {
        $criteria = TransactionFilterCriteria::fromArray(self::flowFiltersToCriteriaArray($filtersRaw));

        $normalized = [];
        foreach ($criteria->toRepositoryFilters() as $key => $value) {
            $normalized[$key] = $value;
        }

        if (isset($filtersRaw['directions']) && is_array($filtersRaw['directions'])) {
            $directions = array_values(array_filter(array_map(
                static fn (mixed $d) => is_string($d) ? trim($d) : '',
                $filtersRaw['directions'],
            )));
            if ($directions !== []) {
                $normalized['directions'] = $directions;
            }
        } elseif (isset($filtersRaw['direction']) && is_string($filtersRaw['direction']) && $filtersRaw['direction'] !== '') {
            $normalized['directions'] = array_values(array_filter(array_map('trim', explode(',', $filtersRaw['direction']))));
        }

        if (isset($filtersRaw['statuses']) && is_array($filtersRaw['statuses'])) {
            $statuses = array_values(array_filter(array_map(
                static fn (mixed $s) => is_string($s) ? trim($s) : '',
                $filtersRaw['statuses'],
            )));
            if ($statuses !== []) {
                $normalized['statuses'] = $statuses;
            }
        } elseif (isset($filtersRaw['status']) && is_string($filtersRaw['status']) && $filtersRaw['status'] !== '') {
            $normalized['statuses'] = array_values(array_filter(array_map('trim', explode(',', $filtersRaw['status']))));
        }

        return $normalized;
    }

    /** @param array<string, mixed> $filtersRaw */
    private static function flowFiltersToCriteriaArray(array $filtersRaw): array
    {
        $data = $filtersRaw;

        if (isset($filtersRaw['directions']) && is_array($filtersRaw['directions'])) {
            $data['direction'] = implode(',', array_map('strval', $filtersRaw['directions']));
        }

        if (isset($filtersRaw['statuses']) && is_array($filtersRaw['statuses'])) {
            $data['status'] = implode(',', array_map('strval', $filtersRaw['statuses']));
        }

        return $data;
    }

    /** @param array<string, mixed> $filtersRaw */
    private static function filtersToQueryBag(array $filtersRaw): array
    {
        $bag = self::flowFiltersToCriteriaArray($filtersRaw);

        foreach (['paidFromPartyId', 'paidToPartyId', 'walletId', 'concernId', 'categoryId'] as $field) {
            if (array_key_exists($field, $bag) && $bag[$field] !== null && $bag[$field] !== '') {
                $bag[$field] = (string) $bag[$field];
            }
        }

        return $bag;
    }
}
