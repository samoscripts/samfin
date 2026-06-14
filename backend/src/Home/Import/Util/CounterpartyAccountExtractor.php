<?php

namespace App\Home\Import\Util;

/**
 * Extracts Polish NRB (26 digits) from mBank operation description text.
 */
final class CounterpartyAccountExtractor
{
    public function extract(?string $description): ?string
    {
        if ($description === null || trim($description) === '') {
            return null;
        }

        if (preg_match(
            '/\bPL\s*(\d{2}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4})\b/i',
            $description,
            $match,
        )) {
            $nrb = preg_replace('/\s+/', '', $match[1]);
            if ($this->isValidNrb($nrb)) {
                return $nrb;
            }
        }

        $compact = preg_replace('/\s+/', '', $description);
        if ($compact === null || $compact === '') {
            return null;
        }

        if (!preg_match_all('/\d{26}/', $compact, $matches)) {
            return null;
        }

        foreach (array_reverse($matches[0]) as $candidate) {
            if ($this->isValidNrb($candidate)) {
                return $candidate;
            }
        }

        return null;
    }

    private function isValidNrb(string $nrb): bool
    {
        return strlen($nrb) === 26 && ctype_digit($nrb);
    }
}
