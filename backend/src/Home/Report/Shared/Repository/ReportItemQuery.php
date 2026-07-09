<?php

namespace App\Home\Report\Shared\Repository;

use App\Home\Report\Shared\DTO\ReportItemFilterCriteria;
use Doctrine\DBAL\ArrayParameterType;

/**
 * Buduje wspólną część zapytań SQL agregujących pozycje transakcji
 * (`transaction_items ti` INNER JOIN `transactions t`) dla raportów Rozbicie i Trend.
 *
 * Zwraca listę warunków WHERE oraz parametry — serwisy dokładają własny SELECT,
 * joiny słownikowe i GROUP BY.
 */
class ReportItemQuery
{
    /** Raporty domowe liczą na pozycjach transakcji sklasyfikowanych (pełnie i częściowo). */
    private const STATUS_SQL = "t.status IN ('CLASSIFIED', 'PARTIALLY_CLASSIFIED')";

    /**
     * @return array{0: list<string>, 1: array<string, mixed>, 2: array<string, int|string>}
     */
    public function buildConditions(ReportItemFilterCriteria $c): array
    {
        $conditions = [self::STATUS_SQL];
        $params     = [];
        $types      = [];

        if ($c->dateFrom !== null && $c->dateFrom !== '') {
            $conditions[]       = 't.trans_date >= :dateFrom';
            $params['dateFrom'] = $c->dateFrom;
        }

        if ($c->dateTo !== null && $c->dateTo !== '') {
            $conditions[]     = 't.trans_date <= :dateTo';
            $params['dateTo'] = $c->dateTo;
        }

        if ($c->directions !== null && $c->directions !== []) {
            if (count($c->directions) === 1) {
                $conditions[]        = 't.direction = :direction';
                $params['direction'] = $c->directions[0];
            } else {
                $conditions[]         = 't.direction IN (:directions)';
                $params['directions'] = array_values($c->directions);
                $types['directions']  = ArrayParameterType::STRING;
            }
        } elseif ($c->direction !== null && $c->direction !== '') {
            $conditions[]        = 't.direction = :direction';
            $params['direction'] = $c->direction;
        }

        if ($c->walletId !== null && $c->walletId !== '') {
            $conditions[]       = 'ti.wallet_id = :walletId';
            $params['walletId'] = (int) $c->walletId;
        }

        if ($c->categoryId !== null && $c->categoryId !== '') {
            $conditions[]         = 'ti.category_id = :categoryId';
            $params['categoryId'] = (int) $c->categoryId;
        }

        if ($c->concernId !== null && $c->concernId !== '') {
            $conditions[]        = 'ti.concern_id = :concernId';
            $params['concernId'] = (int) $c->concernId;
        }

        if ($c->paidFromPartyId !== null && $c->paidFromPartyId !== '') {
            $conditions[]              = 't.paid_from_party_id = :paidFromPartyId';
            $params['paidFromPartyId'] = (int) $c->paidFromPartyId;
        }

        if ($c->paidToPartyId !== null && $c->paidToPartyId !== '') {
            $conditions[]            = 't.paid_to_party_id = :paidToPartyId';
            $params['paidToPartyId'] = (int) $c->paidToPartyId;
        }

        if ($c->amountMin !== null && $c->amountMin !== '') {
            $conditions[]        = 'ABS(ti.amount_minor) >= :amountMin';
            $params['amountMin'] = self::toMinor($c->amountMin);
        }

        if ($c->amountMax !== null && $c->amountMax !== '') {
            $conditions[]        = 'ABS(ti.amount_minor) <= :amountMax';
            $params['amountMax'] = self::toMinor($c->amountMax);
        }

        if ($c->description !== null && $c->description !== '') {
            $conditions[] = 'LOWER(CONCAT_WS(\' \', '
                . 't.trans_title, t.trans_description, t.trans_custom_description, '
                . 't.counterparty_name, ti.description)) LIKE LOWER(:description)';
            $params['description'] = '%' . trim($c->description) . '%';
        }

        return [$conditions, $params, $types];
    }

    private static function toMinor(string $plnValue): int
    {
        return (int) round((float) str_replace(',', '.', $plnValue) * 100);
    }
}
