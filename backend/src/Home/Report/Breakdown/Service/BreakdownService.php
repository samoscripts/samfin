<?php

namespace App\Home\Report\Breakdown\Service;

use App\Home\Report\Breakdown\DTO\BreakdownQuery;
use App\Home\Report\Shared\Repository\ReportItemQuery;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Agregacja pozycji transakcji w jednym okresie (kompozycja wg wymiaru groupBy).
 * Sumy liczone na `transaction_items`, kierunek z `transactions.direction`.
 */
class BreakdownService
{
    private const NULL_LABEL = [
        'categoryMain' => 'Bez kategorii',
        'categorySub'  => 'Bez kategorii',
        'wallet'       => 'Bez portfela',
        'concern'      => 'Bez Dotyczy',
    ];

    public function __construct(
        private EntityManagerInterface $em,
        private ReportItemQuery $reportItemQuery,
    ) {}

    /**
     * @return array{
     *   dateFrom: string, dateTo: string, groupBy: string, direction: string,
     *   total: float, itemCount: int, averageAmount: float, unclassifiedAmount: float,
     *   groups: list<array{id: ?int, name: string, amount: float, share: float, itemCount: int}>
     * }
     */
    public function build(BreakdownQuery $query): array
    {
        $conn = $this->em->getConnection();
        [$conditions, $params] = $this->reportItemQuery->buildConditions($query->filters);
        [$join, $groupIdExpr, $groupNameExpr] = $this->groupingFor($query);

        if ($query->groupBy === 'categorySub' && $query->subCategoryParentId !== null) {
            $conditions[]     = 'cat.parent_id = :subParent';
            $params['subParent'] = (int) $query->subCategoryParentId;
        }

        $where = implode("\n  AND ", $conditions);

        $totalsSql = <<<SQL
            SELECT
                COALESCE(SUM(ABS(ti.amount_minor)), 0) AS total_minor,
                COUNT(*) AS item_count,
                COALESCE(SUM(CASE WHEN ti.category_id IS NULL THEN ABS(ti.amount_minor) ELSE 0 END), 0) AS unclassified_minor
            FROM transaction_items ti
            INNER JOIN transactions t ON t.id = ti.transaction_id
            {$join}
            WHERE {$where}
        SQL;

        $totals = $conn->fetchAssociative($totalsSql, $params) ?: [
            'total_minor' => 0, 'item_count' => 0, 'unclassified_minor' => 0,
        ];

        $totalMinor        = (int) $totals['total_minor'];
        $itemCount         = (int) $totals['item_count'];
        $unclassifiedMinor = (int) $totals['unclassified_minor'];

        $groupsSql = <<<SQL
            SELECT
                {$groupIdExpr} AS group_id,
                {$groupNameExpr} AS group_name,
                SUM(ABS(ti.amount_minor)) AS amount_minor,
                COUNT(*) AS item_count
            FROM transaction_items ti
            INNER JOIN transactions t ON t.id = ti.transaction_id
            {$join}
            WHERE {$where}
            GROUP BY {$groupIdExpr}, {$groupNameExpr}
            ORDER BY amount_minor DESC
        SQL;

        $rows = $conn->fetchAllAssociative($groupsSql, $params);

        $total    = self::toPln($totalMinor);
        $nullName = self::NULL_LABEL[$query->groupBy];

        $groups = array_map(function (array $row) use ($totalMinor, $nullName): array {
            $groupId     = $row['group_id'] !== null ? (int) $row['group_id'] : null;
            $amountMinor = (int) $row['amount_minor'];

            return [
                'id'        => $groupId,
                'name'      => $groupId === null ? $nullName : (string) ($row['group_name'] ?? $nullName),
                'amount'    => self::toPln($amountMinor),
                'share'     => $totalMinor > 0 ? round($amountMinor / $totalMinor * 100, 1) : 0.0,
                'itemCount' => (int) $row['item_count'],
            ];
        }, $rows);

        return [
            'dateFrom'           => $query->dateFrom,
            'dateTo'             => $query->dateTo,
            'groupBy'            => $query->groupBy,
            'direction'          => $query->direction,
            'total'              => $total,
            'itemCount'          => $itemCount,
            'averageAmount'      => $itemCount > 0 ? round($totalMinor / $itemCount / 100, 2) : 0.0,
            'unclassifiedAmount' => self::toPln($unclassifiedMinor),
            'groups'             => $groups,
        ];
    }

    /**
     * @return array{0: string, 1: string, 2: string} [joinSql, groupIdExpr, groupNameExpr]
     */
    private function groupingFor(BreakdownQuery $query): array
    {
        return match ($query->groupBy) {
            'categoryMain' => [
                "LEFT JOIN category cat ON cat.id = ti.category_id\n"
                . "            LEFT JOIN category parent ON parent.id = cat.parent_id",
                'COALESCE(cat.parent_id, cat.id)',
                'COALESCE(parent.name, cat.name)',
            ],
            'categorySub' => [
                'LEFT JOIN category cat ON cat.id = ti.category_id',
                'ti.category_id',
                'cat.name',
            ],
            'wallet' => [
                'LEFT JOIN wallet w ON w.id = ti.wallet_id',
                'ti.wallet_id',
                'w.name',
            ],
            'concern' => [
                'LEFT JOIN concern con ON con.id = ti.concern_id',
                'ti.concern_id',
                'con.name',
            ],
            default => throw new \InvalidArgumentException("Nieznane groupBy: {$query->groupBy}"),
        };
    }

    private static function toPln(int $minor): float
    {
        return round($minor / 100, 2);
    }
}
