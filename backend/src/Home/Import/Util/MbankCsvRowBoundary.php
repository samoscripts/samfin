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

    public function isCsvRecordComplete(string $line): bool
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

        return !$inQuotes;
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
