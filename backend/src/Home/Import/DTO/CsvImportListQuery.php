<?php

namespace App\Home\Import\DTO;

use App\Home\Import\Entity\CsvImport;
use App\Shared\DTO\QueryParams;
use App\Shared\DTO\QueryValidationErrors;
use Symfony\Component\HttpFoundation\InputBag;

final readonly class CsvImportListQuery
{
    public function __construct(
        public int $page = 1,
        public int $perPage = 20,
        public ?string $source = null,
        public ?string $status = null,
    ) {}

    /** @return self|QueryValidationErrors */
    public static function fromInputBag(InputBag $query): self|QueryValidationErrors
    {
        $errors = [];

        $page = QueryParams::positiveInt($query->get('page'), 'page', 1, 1);
        $errors = QueryParams::mergeErrors($errors, $page);

        $perPage = QueryParams::perPage($query, 20, 100);
        $errors = QueryParams::mergeErrors($errors, $perPage);

        $source = null;
        if ($query->has('source')) {
            $parsed = QueryParams::optionalEnum($query->get('source'), 'source', ['MBANK']);
            $errors = QueryParams::mergeErrors($errors, $parsed);
            if (!QueryParams::isError($parsed)) {
                $source = $parsed;
            }
        }

        $status = null;
        if ($query->has('status')) {
            $parsed = QueryParams::optionalEnum(
                $query->get('status'),
                'status',
                [
                    CsvImport::STATUS_PENDING,
                    CsvImport::STATUS_VALIDATED,
                    CsvImport::STATUS_FAILED,
                    CsvImport::STATUS_IMPORTED,
                ],
            );
            $errors = QueryParams::mergeErrors($errors, $parsed);
            if (!QueryParams::isError($parsed)) {
                $status = $parsed;
            }
        }

        if ($errors !== []) {
            return new QueryValidationErrors($errors);
        }

        return new self(
            page: $page,
            perPage: $perPage,
            source: $source,
            status: $status,
        );
    }

    /** @return array<string, mixed> */
    public function toCriteria(): array
    {
        return array_filter([
            'source' => $this->source,
            'status' => $this->status,
        ], static fn (mixed $v) => $v !== null && $v !== '');
    }
}
