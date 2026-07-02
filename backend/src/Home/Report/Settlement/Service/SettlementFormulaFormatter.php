<?php

namespace App\Home\Report\Settlement\Service;

/**
 * Polskie opisy formuł sugerowanej wpłaty (tylko backend).
 */
class SettlementFormulaFormatter
{
    public static function format(
        bool $isAnchor,
        int $catchUpMinor,
        int $walletMinor,
        int $prepaidMinor,
        int $baseDepositMinor,
        ?string $asOfDate = null,
    ): string {
        $parts = [];

        if ($asOfDate !== null) {
            $parts[] = sprintf('Stan indeksu na %s.', $asOfDate);
        }

        if ($isAnchor) {
            if ($catchUpMinor === $baseDepositMinor && $catchUpMinor > 0) {
                $parts[] = sprintf('wpłata bazowa %s', self::pln($catchUpMinor));
            } elseif ($catchUpMinor > 0) {
                $parts[] = sprintf('dorównanie %s', self::pln($catchUpMinor));
            }

            if ($walletMinor > 0) {
                $parts[] = sprintf('portfele %s', self::pln($walletMinor));
            }
        } else {
            $parts[] = 'nie jesteś teraz w kolejce do wpłaty rotacyjnej';
            if ($walletMinor > 0) {
                $parts[] = sprintf('dług portfelowy %s', self::pln($walletMinor));
            }
        }

        if ($prepaidMinor > 0) {
            $parts[] = sprintf('− prepaid %s', self::pln($prepaidMinor));
        }

        return implode(' + ', array_filter($parts, static fn (string $p) => $p !== ''));
    }

    private static function pln(int $minor): string
    {
        return number_format($minor / 100, 2, ',', ' ') . ' zł';
    }
}
