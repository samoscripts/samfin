<?php

namespace App\Home\Import\DTO;

use App\Home\Import\Entity\CsvImportError;
use App\Shared\DTO\QueryParams;
use App\Shared\DTO\QueryValidationErrors;
use Symfony\Component\HttpFoundation\InputBag;

final readonly class CsvImportErrorsQuery
{
    public function __construct(
        public int $page = 1,
        public int $perPage = 50,
        public ?string $scope = null,
    ) {}

    /** @return self|QueryValidationErrors */
    public static function fromInputBag(InputBag $query): self|QueryValidationErrors
    {
        $errors = [];

        $page = QueryParams::positiveInt($query->get('page'), 'page', 1, 1);
        $errors = QueryParams::mergeErrors($errors, $page);

        $perPage = QueryParams::perPage($query, 50, 200);
        $errors = QueryParams::mergeErrors($errors, $perPage);

        $scope = null;
        if ($query->has('scope')) {
            $parsed = QueryParams::optionalEnum(
                $query->get('scope'),
                'scope',
                [CsvImportError::SCOPE_HEADER, CsvImportError::SCOPE_ROW],
            );
            $errors = QueryParams::mergeErrors($errors, $parsed);
            if (!QueryParams::isError($parsed)) {
                $scope = $parsed;
            }
        }

        if ($errors !== []) {
            return new QueryValidationErrors($errors);
        }

        return new self($page, $perPage, $scope);
    }
}
