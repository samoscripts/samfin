<?php

namespace App\Home\Import\DTO;

use App\Home\Import\Entity\CsvImportRow;
use App\Shared\DTO\QueryParams;
use App\Shared\DTO\QueryValidationErrors;
use Symfony\Component\HttpFoundation\InputBag;

final readonly class CsvImportRowsQuery
{
    public function __construct(
        public int $page = 1,
        public int $perPage = 100,
        public ?string $parseStatus = null,
    ) {}

    /** @return self|QueryValidationErrors */
    public static function fromInputBag(InputBag $query): self|QueryValidationErrors
    {
        $errors = [];

        $page = QueryParams::positiveInt($query->get('page'), 'page', 1, 1);
        $errors = QueryParams::mergeErrors($errors, $page);

        $perPage = QueryParams::perPage($query, 100, 200);
        $errors = QueryParams::mergeErrors($errors, $perPage);

        $parseStatus = null;
        if ($query->has('parseStatus')) {
            $parsed = QueryParams::optionalEnum(
                $query->get('parseStatus'),
                'parseStatus',
                [
                    CsvImportRow::STATUS_VALIDATED,
                    CsvImportRow::STATUS_PARSE_ERROR,
                    CsvImportRow::STATUS_DUPLICATE,
                    CsvImportRow::STATUS_IMPORTED,
                ],
            );
            $errors = QueryParams::mergeErrors($errors, $parsed);
            if (!QueryParams::isError($parsed)) {
                $parseStatus = $parsed;
            }
        }

        if ($errors !== []) {
            return new QueryValidationErrors($errors);
        }

        return new self($page, $perPage, $parseStatus);
    }
}
