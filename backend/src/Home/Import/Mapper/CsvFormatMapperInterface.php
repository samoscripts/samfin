<?php

namespace App\Home\Import\Mapper;

use App\Home\Import\DTO\ImportErrorData;
use App\Home\Import\DTO\NormalizedImportRow;
use App\Home\Import\Enum\CsvFormatVersion;

interface CsvFormatMapperInterface
{
    public function getFormatVersion(): CsvFormatVersion;

    /** @param list<string> $headerCols */
    public function matchesHeader(array $headerCols): bool;

    /**
     * @param list<string> $cols
     * @return array{row: ?NormalizedImportRow, fatalError: ?ImportErrorData, stopParsing?: bool}
     */
    public function mapDataLine(int $lineNo, array $cols): array;
}
