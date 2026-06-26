<?php

namespace App\Home\Import\Util;

final class BankAccountNormalizer
{
    public function normalize(?string $raw): ?string
    {
        if ($raw === null) {
            return null;
        }

        $trimmed = trim($raw, " \t\n\r\0\x0B'");
        if ($trimmed === '') {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $trimmed);
        if ($digits === null || strlen($digits) !== 26) {
            return null;
        }

        return $digits;
    }
}
