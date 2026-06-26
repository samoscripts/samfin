<?php

namespace App\Home\Import\Mapper\Mbank;

use App\Home\Import\DTO\ImportErrorData;
use App\Home\Import\DTO\NormalizedImportRow;
use App\Home\Import\Enum\CsvFormatVersion;
use App\Home\Import\Mapper\CsvFormatMapperInterface;
use App\Home\Import\Util\BankAccountNormalizer;
use App\Home\Import\Util\CsvAmountParser;
use App\Home\Import\Util\CsvImportDateParser;
use App\Home\Import\Util\MbankTitleParser;
use App\Home\Import\Util\MbankCsvRowBoundary;

final class MbankElectronicStatementMapper implements CsvFormatMapperInterface
{
    private const EXPECTED_COLUMNS = 8;

    public function __construct(
        private readonly CsvAmountParser $amountParser,
        private readonly CsvImportDateParser $dateParser,
        private readonly BankAccountNormalizer $bankAccountNormalizer,
        private readonly MbankTitleParser $titleParser,
        private readonly MbankCsvRowBoundary $rowBoundary,
    ) {}

    public function getFormatVersion(): CsvFormatVersion
    {
        return CsvFormatVersion::MbankElectronicStatement;
    }

    public function matchesHeader(array $headerCols): bool
    {
        $first = $this->normalizeMarker($headerCols[0] ?? '');

        return $first === 'data księgowania' && count($headerCols) >= self::EXPECTED_COLUMNS;
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

        $bookingDateRaw      = trim($cols[0]);
        $statementDateRaw    = trim($cols[1]);
        $operationType       = trim($cols[2]);
        $titleRaw            = trim($cols[3]);
        $counterpartyName    = trim($cols[4]);
        $counterpartyAccount = $this->bankAccountNormalizer->normalize(trim($cols[5]));
        $amountRaw           = trim($cols[6]);
        $balanceRaw          = trim($cols[7]);

        $titleClean    = $this->titleParser->cleanTitle($titleRaw !== '' ? $titleRaw : null);
        $operationDate = $this->titleParser->extractTransactionDate($titleRaw !== '' ? $titleRaw : null)
            ?? $this->dateParser->parse($statementDateRaw);

        if ($bookingDateRaw === '' && $statementDateRaw === '') {
            if ($this->rowBoundary->isDisclaimerRow($cols)) {
                return ['row' => null, 'fatalError' => null, 'stopParsing' => true];
            }

            return [
                'row' => $this->buildRow(
                    lineNo: $lineNo,
                    bookingDate: null,
                    operationDate: null,
                    operationType: $operationType ?: null,
                    titleRaw: $titleRaw ?: null,
                    titleClean: $titleClean,
                    counterpartyName: $counterpartyName ?: null,
                    counterpartyAccount: $counterpartyAccount,
                    amountRaw: $amountRaw ?: null,
                    amountMinor: null,
                    balanceAfterMinor: null,
                    parseStatus: 'ERROR',
                    parseError: 'Brak daty operacji — linia pominięta.',
                ),
                'fatalError' => null,
            ];
        }

        $parseStatus = 'OK';
        $parseError  = null;

        $bookingDate = $this->dateParser->parse($bookingDateRaw);
        if ($bookingDateRaw !== '' && $bookingDate === null) {
            $parseStatus = 'ERROR';
            $parseError  = "Nieprawidłowy format daty księgowania: {$bookingDateRaw}";
        }

        if ($operationDate === null) {
            $parseStatus = 'ERROR';
            $parseError  = ($parseError ? $parseError . '; ' : '')
                . "Nieprawidłowy format daty operacji: {$statementDateRaw}";
        }

        $amountMinor = null;
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

        $balanceAfterMinor = null;
        if ($balanceRaw !== '') {
            $balanceParsed = $this->amountParser->parse($balanceRaw);
            if ($balanceParsed === null) {
                $parseStatus = 'ERROR';
                $parseError  = ($parseError ? $parseError . '; ' : '') . "Nieprawidłowe saldo: {$balanceRaw}";
            } else {
                [$balanceAfterMinor, $balanceCurrency] = $balanceParsed;
                if ($balanceCurrency !== 'PLN') {
                    $parseStatus = 'ERROR';
                    $parseError  = ($parseError ? $parseError . '; ' : '') . "Obsługiwana jest tylko waluta PLN dla salda (wykryto: {$balanceCurrency})";
                }
            }
        }

        return [
            'row' => $this->buildRow(
                lineNo: $lineNo,
                bookingDate: $bookingDate,
                operationDate: $operationDate,
                operationType: $operationType ?: null,
                titleRaw: $titleRaw ?: null,
                titleClean: $titleClean,
                counterpartyName: $counterpartyName ?: null,
                counterpartyAccount: $counterpartyAccount,
                amountRaw: $amountRaw ?: null,
                amountMinor: $amountMinor,
                balanceAfterMinor: $balanceAfterMinor,
                parseStatus: $parseStatus,
                parseError: $parseError,
            ),
            'fatalError' => null,
        ];
    }

    private function buildRow(
        int $lineNo,
        ?\DateTimeImmutable $bookingDate,
        ?\DateTimeImmutable $operationDate,
        ?string $operationType,
        ?string $titleRaw,
        ?string $titleClean,
        ?string $counterpartyName,
        ?string $counterpartyAccount,
        ?string $amountRaw,
        ?int $amountMinor,
        ?int $balanceAfterMinor,
        string $parseStatus,
        ?string $parseError,
    ): NormalizedImportRow {
        return new NormalizedImportRow(
            csvFormat: CsvFormatVersion::MbankElectronicStatement,
            lineNo: $lineNo,
            bookingDate: $bookingDate,
            operationDate: $operationDate,
            descriptionRaw: $operationType,
            operationType: $operationType,
            titleRaw: $titleRaw,
            title: $titleClean,
            counterpartyName: $counterpartyName,
            ownAccountLabelRaw: null,
            counterpartyAccount: $counterpartyAccount,
            bankCategoryRaw: null,
            amountRaw: $amountRaw,
            amountMinor: $amountMinor,
            balanceAfterMinor: $balanceAfterMinor,
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
