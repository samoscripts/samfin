<?php

namespace App\Home\Import\Util;

final class CsvAmountParser
{
    /** @return array{0: int, 1: string}|null */
    public function parse(?string $raw): ?array
    {
        if ($raw === null || trim($raw) === '') {
            return null;
        }

        $raw = trim($raw);
        $currency = 'PLN';

        if (preg_match('/([A-Z]{3})\s*$/', $raw, $m)) {
            $currency = $m[1];
            $raw      = trim(substr($raw, 0, -strlen($m[0])));
        }

        $raw = preg_replace('/\s+/', '', $raw);
        $raw = str_replace(',', '.', $raw ?? '');

        if ($raw === '' || !is_numeric($raw)) {
            return null;
        }

        $amountMinor = (int) round((float) $raw * 100);

        return [$amountMinor, $currency];
    }
}
