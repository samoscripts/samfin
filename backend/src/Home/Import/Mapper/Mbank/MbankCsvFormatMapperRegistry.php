<?php

namespace App\Home\Import\Mapper\Mbank;

use App\Home\Import\Mapper\CsvFormatMapperInterface;

final class MbankCsvFormatMapperRegistry
{
    /** @var list<CsvFormatMapperInterface> */
    private array $mappers;

    public function __construct(
        MbankElectronicStatementMapper $electronicStatementMapper,
        MbankOperationsListMapper $operationsListMapper,
    ) {
        $this->mappers = [
            $electronicStatementMapper,
            $operationsListMapper,
        ];
    }

    /** @param list<string> $headerCols */
    public function resolveForHeader(array $headerCols): ?CsvFormatMapperInterface
    {
        foreach ($this->mappers as $mapper) {
            if ($mapper->matchesHeader($headerCols)) {
                return $mapper;
            }
        }

        return null;
    }
}
