<?php

namespace App\Home\Report\Breakdown\Service;

use App\Home\Report\Breakdown\DTO\BreakdownQuery;
use App\Home\Report\Shared\Repository\ReportItemQuery;
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
     * @return array<string, mixed>
     */
    public function build(BreakdownQuery $query): array
    {
        if ($query->hasBothDirections()) {
            return $this->buildBothDirections($query);
        }

        return $this->buildSingleDirection($query);
    }

    /**
     * @return array<string, mixed>
     */
    private function buildSingleDirection(BreakdownQuery $query): array
    {
        $conn = $this->em->getConnection();
        [$conditions, $params, $types] = $this->reportItemQuery->buildConditions($query->filters);
        [$join, $groupIdExpr, $groupNameExpr] = $this->groupingFor($query);

        if ($query->groupBy === 'categorySub' && $query->subCategoryParentId !== null) {
            $conditions[]          = 'cat.parent_id = :subParent';
            $params['subParent']   = (int) $query->subCategoryParentId;
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

        $totals = $conn->fetchAssociative($totalsSql, $params, $types) ?: [
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

        $rows = $conn->fetchAllAssociative($groupsSql, $params, $types);

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

        $total = self::toPln($totalMinor);

        return [
            'dateFrom'           => $query->dateFrom,
            'dateTo'             => $query->dateTo,
            'groupBy'            => $query->groupBy,
            'direction'          => $query->legacyDirection(),
            'directions'         => $query->directions,
            'total'              => $total,
            'itemCount'          => $itemCount,
            'averageAmount'      => $itemCount > 0 ? round($totalMinor / $itemCount / 100, 2) : 0.0,
            'unclassifiedAmount' => self::toPln($unclassifiedMinor),
            'groups'             => $groups,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function buildBothDirections(BreakdownQuery $query): array
    {
        $conn = $this->em->getConnection();
        [$conditions, $params, $types] = $this->reportItemQuery->buildConditions($query->filters);
        [$join, $groupIdExpr, $groupNameExpr] = $this->groupingFor($query);

        if ($query->groupBy === 'categorySub' && $query->subCategoryParentId !== null) {
            $conditions[]        = 'cat.parent_id = :subParent';
            $params['subParent'] = (int) $query->subCategoryParentId;
        }

        $where = implode("\n  AND ", $conditions);

        $totalsSql = <<<SQL
            SELECT
                COALESCE(SUM(CASE WHEN t.direction = 'EXPENSE' THEN ABS(ti.amount_minor) ELSE 0 END), 0) AS expense_minor,
                COALESCE(SUM(CASE WHEN t.direction = 'INCOME' THEN ABS(ti.amount_minor) ELSE 0 END), 0) AS income_minor,
                COUNT(*) AS item_count,
                COALESCE(SUM(CASE WHEN ti.category_id IS NULL AND t.direction = 'EXPENSE' THEN ABS(ti.amount_minor) ELSE 0 END), 0) AS unclassified_minor
            FROM transaction_items ti
            INNER JOIN transactions t ON t.id = ti.transaction_id
            {$join}
            WHERE {$where}
        SQL;

        $totals = $conn->fetchAssociative($totalsSql, $params, $types) ?: [
            'expense_minor' => 0, 'income_minor' => 0, 'item_count' => 0, 'unclassified_minor' => 0,
        ];

        $expenseMinor      = (int) $totals['expense_minor'];
        $incomeMinor       = (int) $totals['income_minor'];
        $itemCount         = (int) $totals['item_count'];
        $unclassifiedMinor = (int) $totals['unclassified_minor'];

        $groupsSql = <<<SQL
            SELECT
                {$groupIdExpr} AS group_id,
                {$groupNameExpr} AS group_name,
                COALESCE(SUM(CASE WHEN t.direction = 'EXPENSE' THEN ABS(ti.amount_minor) ELSE 0 END), 0) AS expense_minor,
                COALESCE(SUM(CASE WHEN t.direction = 'INCOME' THEN ABS(ti.amount_minor) ELSE 0 END), 0) AS income_minor,
                COUNT(*) AS item_count
            FROM transaction_items ti
            INNER JOIN transactions t ON t.id = ti.transaction_id
            {$join}
            WHERE {$where}
            GROUP BY {$groupIdExpr}, {$groupNameExpr}
            ORDER BY (
                COALESCE(SUM(CASE WHEN t.direction = 'EXPENSE' THEN ABS(ti.amount_minor) ELSE 0 END), 0)
                + COALESCE(SUM(CASE WHEN t.direction = 'INCOME' THEN ABS(ti.amount_minor) ELSE 0 END), 0)
            ) DESC
        SQL;

        $rows     = $conn->fetchAllAssociative($groupsSql, $params, $types);
        $nullName = self::NULL_LABEL[$query->groupBy];

        $groups = array_map(function (array $row) use ($expenseMinor, $incomeMinor, $nullName): array {
            $groupId       = $row['group_id'] !== null ? (int) $row['group_id'] : null;
            $expenseMinorG = (int) $row['expense_minor'];
            $incomeMinorG  = (int) $row['income_minor'];
            $turnoverMinor = $expenseMinorG + $incomeMinorG;

            return [
                'id'          => $groupId,
                'name'        => $groupId === null ? $nullName : (string) ($row['group_name'] ?? $nullName),
                'expenses'    => self::toPln($expenseMinorG),
                'income'      => self::toPln($incomeMinorG),
                'amount'      => self::toPln($turnoverMinor),
                'share'       => $expenseMinor > 0 ? round($expenseMinorG / $expenseMinor * 100, 1) : 0.0,
                'shareIncome' => $incomeMinor > 0 ? round($incomeMinorG / $incomeMinor * 100, 1) : 0.0,
                'itemCount'   => (int) $row['item_count'],
            ];
        }, $rows);

        $expensesTotal = self::toPln($expenseMinor);
        $incomeTotal   = self::toPln($incomeMinor);

        return [
            'dateFrom'           => $query->dateFrom,
            'dateTo'             => $query->dateTo,
            'groupBy'            => $query->groupBy,
            'direction'          => $query->legacyDirection(),
            'directions'         => $query->directions,
            'total'              => $expensesTotal,
            'itemCount'          => $itemCount,
            'averageAmount'      => $itemCount > 0 ? round(($expenseMinor + $incomeMinor) / $itemCount / 100, 2) : 0.0,
            'unclassifiedAmount' => self::toPln($unclassifiedMinor),
            'totals'             => [
                'expenses' => $expensesTotal,
                'income'   => $incomeTotal,
                'net'      => round($incomeTotal - $expensesTotal, 2),
            ],
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
