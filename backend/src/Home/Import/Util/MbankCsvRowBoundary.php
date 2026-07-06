<?php

namespace App\Home\Import\Util;

/**
 * Detects end of mBank CSV data section (footers, metadata lines after transactions).
 */
final class MbankCsvRowBoundary
{
    public function __construct(
        private readonly CsvImportDateParser $dateParser,
    ) {}

    public function isMetadataLine(string $line): bool
    {
        $trimmed = trim($line);

        return $trimmed !== '' && str_starts_with($trimmed, '#');
    }

    /**
     * Stopka prawna mBank po sekcji transakcji (np. art. 7 Ustawy Prawo Bankowe).
     */
    public function isDisclaimerLine(string $line): bool
    {
        return $this->textLooksLikeDisclaimer($line);
    }

    /**
     * @param list<string> $cols
     */
    public function isDisclaimerRow(array $cols): bool
    {
        $parts = array_filter(
            array_map(static fn (string $value): string => trim($value), $cols),
            static fn (string $value): bool => $value !== '',
        );

        return $this->textLooksLikeDisclaimer(implode(' ', $parts));
    }

    private function textLooksLikeDisclaimer(string $text): bool
    {
        $normalized = mb_strtolower(trim($text));
        if ($normalized === '') {
            return false;
        }

        return str_contains($normalized, 'niniejszy dokument sporządzono')
            || str_contains($normalized, 'ustawy prawo bankowe')
            || str_contains($normalized, 'ustawy - prawo bankowe')
            || str_contains($normalized, 'art. 7 ustawy');
    }

    public function isCsvRecordComplete(string $line, ?int $expectedDataColumnCount = null): bool
    {
        $inQuotes = false;
        $length   = strlen($line);

        for ($i = 0; $i < $length; $i++) {
            if ($line[$i] !== '"') {
                continue;
            }

            if ($inQuotes && ($line[$i + 1] ?? '') === '"') {
                $i++;

                continue;
            }

            $inQuotes = !$inQuotes;
        }

        if (!$inQuotes) {
            return true;
        }

        // mBank czasem eksportuje nazwy z cudzysłowem w środku (np. Piekarnia "Jak Dawnie")
        // bez podwojenia — str_getcsv i tak daje 8 kolumn, ale licznik cudzysłowów zostaje „otwarty”.
        if ($expectedDataColumnCount !== null && $this->hasExpectedParsedColumnCount($line, $expectedDataColumnCount)) {
            return true;
        }

        return false;
    }

    public function looksLikeNewDataRowStart(string $line): bool
    {
        $firstField = trim(explode(';', trim($line), 2)[0]);

        return $this->looksLikeDataRowStart($firstField);
    }

    private function countNormalizedColumns(array $cols): int
    {
        while ($cols !== [] && trim($cols[array_key_last($cols)] ?? '') === '') {
            array_pop($cols);
        }

        return count($cols);
    }

    private function hasExpectedParsedColumnCount(string $line, int $expectedColumnCount): bool
    {
        $cols = str_getcsv($line, ';', '"');

        if ($this->countNormalizedColumns($cols) < $expectedColumnCount) {
            return false;
        }

        return $this->looksLikeDataRowStart(trim($cols[0] ?? ''));
    }

    /**
     * @param list<string> $cols
     */
    public function isEndOfDataColumns(array $cols, int $expectedColumnCount): bool
    {
        $first = trim($cols[0] ?? '');
        if ($first !== '' && str_starts_with($first, '#')) {
            return true;
        }

        $nonEmptyCount = count(array_filter(
            $cols,
            static fn (string $value): bool => trim($value) !== '',
        ));

        if ($nonEmptyCount === 0) {
            return true;
        }

        if ($this->isDisclaimerRow($cols)) {
            return true;
        }

        if ($nonEmptyCount >= $expectedColumnCount) {
            return false;
        }

        return !$this->looksLikeDataRowStart($first);
    }

    private function looksLikeDataRowStart(string $first): bool
    {
        if ($first === '') {
            return false;
        }

        if ($this->dateParser->parse($first) !== null) {
            return true;
        }

        return preg_match('/^\d{4}-\d{2}-\d{2}/', $first) === 1
            || preg_match('/^\d{2}\.\d{2}\.\d{4}/', $first) === 1;
    }
}
