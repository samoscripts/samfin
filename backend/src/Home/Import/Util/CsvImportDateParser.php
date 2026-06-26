<?php

namespace App\Home\Import\Util;

final class CsvImportDateParser
{
    public function parse(?string $raw): ?\DateTimeImmutable
    {
        if ($raw === null) {
            return null;
        }

        $clean = trim($raw);
        if ($clean === '') {
            return null;
        }

        foreach (['Y-m-d', 'd.m.Y', 'd-m-Y'] as $format) {
            $dt = \DateTimeImmutable::createFromFormat($format, $clean);
            if ($dt !== false) {
                return $dt->setTime(0, 0, 0);
            }
        }

        return null;
    }
}
