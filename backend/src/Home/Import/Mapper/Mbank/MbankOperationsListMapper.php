<?php

namespace App\Home\Import\Mapper\Mbank;

use App\Home\Import\DTO\ImportErrorData;
use App\Home\Import\DTO\NormalizedImportRow;
use App\Home\Import\Enum\CsvFormatVersion;
use App\Home\Import\Mapper\CsvFormatMapperInterface;
use App\Home\Import\Util\CounterpartyAccountExtractor;
use App\Home\Import\Util\CsvAmountParser;
use App\Home\Import\Util\CsvImportDateParser;
use App\Home\Import\Util\MbankCsvRowBoundary;

final class MbankOperationsListMapper implements CsvFormatMapperInterface
{
    private const EXPECTED_COLUMNS = 5;

    public function __construct(
        private readonly CsvAmountParser $amountParser,
        private readonly CsvImportDateParser $dateParser,
        private readonly CounterpartyAccountExtractor $counterpartyAccountExtractor,
        private readonly MbankCsvRowBoundary $rowBoundary,
    ) {}

    public function getFormatVersion(): CsvFormatVersion
    {
        return CsvFormatVersion::MbankOperationsList;
    }

    public function matchesHeader(array $headerCols): bool
    {
        $first = $this->normalizeMarker($headerCols[0] ?? '');

        return $first === 'data operacji' && count($headerCols) === self::EXPECTED_COLUMNS;
    }

    public function mapDataLine(int $lineNo, array $cols): array
    {
        $cols     = $this->normalizeDataColumns($cols);
        $colCount = count($cols);

        if ($this->rowBoundary->isDisclaimerRow($cols)) {
            return ['row' => null, 'fatalError' => null, 'stopParsing' => true];
        }

        if ($colCount < self::EXPECTED_COLUMNS) {
            if ($this->rowBoundary->isEndOfDataColumns($cols, self::EXPECTED_COLUMNS)) {
                return ['row' => null, 'fatalError' => null, 'stopParsing' => true];
            }

            return [
                'row' => null,
                'fatalError' => new ImportErrorData(
                    scope: 'ROW',
                    code: 'CSV_COLUMN_LAYOUT_MISMATCH',
                    message: sprintf(
                        'Import przerwany: wiersz %d ma za mało kolumn (%d z %d wymaganych).',
                        $lineNo,
                        $colCount,
                        self::EXPECTED_COLUMNS,
                    ),
                    lineNo: $lineNo,
                    fatal: true,
                ),
            ];
        }

        if ($colCount > self::EXPECTED_COLUMNS) {
            return [
                'row' => null,
                'fatalError' => new ImportErrorData(
                    scope: 'ROW',
                    code: 'CSV_COLUMN_LAYOUT_MISMATCH',
                    message: sprintf(
                        'Import przerwany: wiersz %d zawiera dodatkowe kolumny (%d zamiast %d).',
                        $lineNo,
                        $colCount,
                        self::EXPECTED_COLUMNS,
                    ),
                    lineNo: $lineNo,
                    fatal: true,
                ),
            ];
        }

        $dateStr                = trim($cols[0]);
        $description            = trim($cols[1]);
        $ownAccountLabelRaw     = trim($cols[2]);
        $bankCategory           = trim($cols[3]);
        $amountRaw              = trim($cols[4]);
        $counterpartyAccountRaw = $this->counterpartyAccountExtractor->extract($description);

        if ($dateStr === '') {
            if ($this->rowBoundary->isDisclaimerRow($cols)) {
                return ['row' => null, 'fatalError' => null, 'stopParsing' => true];
            }

            return [
                'row' => $this->buildRow(
                    lineNo: $lineNo,
                    operationDate: null,
                    descriptionRaw: $description ?: null,
                    ownAccountLabelRaw: $ownAccountLabelRaw ?: null,
                    counterpartyAccount: $counterpartyAccountRaw,
                    bankCategoryRaw: $bankCategory ?: null,
                    amountRaw: $amountRaw ?: null,
                    amountMinor: null,
                    parseStatus: 'ERROR',
                    parseError: 'Brak daty operacji — linia pominięta.',
                ),
                'fatalError' => null,
            ];
        }

        $parseStatus   = 'OK';
        $parseError    = null;
        $operationDate = $this->dateParser->parse($dateStr);
        $amountMinor   = null;

        if ($operationDate === null) {
            $parseStatus = 'ERROR';
            $parseError  = "Nieprawidłowy format daty: {$dateStr}";
        }

        if ($amountRaw !== '') {
            $parsed = $this->amountParser->parse($amountRaw);
            if ($parsed === null) {
                $parseStatus = 'ERROR';
                $parseError  = ($parseError ? $parseError . '; ' : '') . "Nieprawidłowa kwota: {$amountRaw}";
            } else {
                [$amountMinor, $currency] = $parsed;
                if ($currency !== 'PLN') {
                    $parseStatus = 'ERROR';
                    $parseError  = ($parseError ? $parseError . '; ' : '') . "Obsługiwana jest tylko waluta PLN (wykryto: {$currency})";
                }
            }
        }

        return [
            'row' => $this->buildRow(
                lineNo: $lineNo,
                operationDate: $operationDate,
                descriptionRaw: $description ?: null,
                ownAccountLabelRaw: $ownAccountLabelRaw ?: null,
                counterpartyAccount: $counterpartyAccountRaw,
                bankCategoryRaw: $bankCategory ?: null,
                amountRaw: $amountRaw ?: null,
                amountMinor: $amountMinor,
                parseStatus: $parseStatus,
                parseError: $parseError,
            ),
            'fatalError' => null,
        ];
    }

    private function buildRow(
        int $lineNo,
        ?\DateTimeImmutable $operationDate,
        ?string $descriptionRaw,
        ?string $ownAccountLabelRaw,
        ?string $counterpartyAccount,
        ?string $bankCategoryRaw,
        ?string $amountRaw,
        ?int $amountMinor,
        string $parseStatus,
        ?string $parseError,
    ): NormalizedImportRow {
        return new NormalizedImportRow(
            csvFormat: CsvFormatVersion::MbankOperationsList,
            lineNo: $lineNo,
            bookingDate: null,
            operationDate: $operationDate,
            descriptionRaw: $descriptionRaw,
            operationType: null,
            titleRaw: null,
            title: null,
            counterpartyName: null,
            ownAccountLabelRaw: $ownAccountLabelRaw,
            counterpartyAccount: $counterpartyAccount,
            bankCategoryRaw: $bankCategoryRaw,
            amountRaw: $amountRaw,
            amountMinor: $amountMinor,
            balanceAfterMinor: null,
            parseStatus: $parseStatus,
            parseError: $parseError,
        );
    }

    /** @param list<string> $cols */
    private function normalizeDataColumns(array $cols): array
    {
        while ($cols !== [] && ($cols[array_key_last($cols)] ?? '') === '') {
            array_pop($cols);
        }

        return $cols;
    }

    private function normalizeMarker(string $value): string
    {
        $first = ltrim($value, '#');
        $first = rtrim($first, ':');

        return mb_strtolower(trim($first));
    }
}
