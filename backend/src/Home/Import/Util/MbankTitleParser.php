<?php

namespace App\Home\Import\Util;

final class MbankTitleParser
{
    private const TRANSACTION_DATE_PATTERN = '/DATA TRANSAKCJI:\s*(\d{4}-\d{2}-\d{2})/u';

    /** Usuwa sufiks DATA TRANSAKCJI z datą na końcu tytułu. */
    private const TRANSACTION_DATE_SUFFIX_PATTERN = '/\s*DATA TRANSAKCJI:\s*\d{4}-\d{2}-\d{2}\s*$/u';

    /** Ucięty sufiks bez daty (stała szerokość kolumny mBank). */
    private const TRANSACTION_DATE_TRUNCATED_SUFFIX_PATTERN = '/\s*\/?\s*DATA TRANSAKCJI:\s*$/u';

    public function extractTransactionDate(?string $title): ?\DateTimeImmutable
    {
        if ($title === null || !preg_match(self::TRANSACTION_DATE_PATTERN, $title, $match)) {
            return null;
        }

        $dt = \DateTimeImmutable::createFromFormat('Y-m-d', $match[1]);

        return $dt !== false ? $dt->setTime(0, 0, 0) : null;
    }

    public function cleanTitle(?string $title): ?string
    {
        if ($title === null) {
            return null;
        }

        $cleaned = preg_replace(self::TRANSACTION_DATE_SUFFIX_PATTERN, '', $title);
        $cleaned = preg_replace(self::TRANSACTION_DATE_TRUNCATED_SUFFIX_PATTERN, '', $cleaned ?? '');
        $trimmed = trim($cleaned ?? '');

        return $trimmed !== '' ? $trimmed : null;
    }
}
