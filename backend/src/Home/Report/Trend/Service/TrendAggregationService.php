<?php

namespace App\Home\Report\Trend\Service;

use App\Home\Report\Shared\Repository\ReportItemQuery;
use App\Home\Report\Trend\DTO\TrendQuery;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Agregacja pozycji transakcji w kubełkach czasowych (miesiąc / kwartał / rok).
 * Serie porównawcze wg trendSeriesBy; kwoty na `transaction_items`.
 */
class TrendAggregationService
{
    private const MONTH_LABELS = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];
    private const QUARTER_LABELS = ['I kw.', 'II kw.', 'III kw.', 'IV kw.'];

    public function __construct(
        private EntityManagerInterface $em,
        private ReportItemQuery $reportItemQuery,
    ) {}

    /**
     * @return array{
     *   dateFrom: ?string, dateTo: ?string, granularity: string, seriesBy: string,
     *   points: list<array{period: string, label: string, totals: array{income: float, expenses: float}, series: list<array{id: string, name: string, income: float, expenses: float}>}>
     * }
     */
    public function build(TrendQuery $query): array
    {
        $descriptors = $this->resolveSeriesDescriptors($query);
        $bounds      = $this->resolveBucketBounds($query);
        $buckets     = $bounds !== null
            ? $this->listBuckets($bounds[0], $bounds[1], $query->granularity)
            : [];

        // Inicjalizacja: bucket -> seriesId -> [income, expenses]
        $acc = [];
        foreach ($buckets as $b) {
            foreach ($descriptors as $d) {
                $acc[$b['period']][$d['id']] = ['income' => 0, 'expenses' => 0];
            }
        }

        foreach ($descriptors as $d) {
            foreach ($this->fetchSeriesRows($query, $d) as $row) {
                $period = (string) $row['bucket'];
                if (!isset($acc[$period][$d['id']])) {
                    continue; // poza zakresem kubełków
                }
                $key = $row['direction'] === 'INCOME' ? 'income' : 'expenses';
                $acc[$period][$d['id']][$key] += (int) $row['amount_minor'];
            }
        }

        $points = [];
        foreach ($buckets as $b) {
            $series       = [];
            $totalIncome  = 0;
            $totalExpense = 0;
            foreach ($descriptors as $d) {
                $incomeMinor  = $acc[$b['period']][$d['id']]['income'];
                $expenseMinor = $acc[$b['period']][$d['id']]['expenses'];
                $totalIncome  += $incomeMinor;
                $totalExpense += $expenseMinor;
                $series[] = [
                    'id'       => $d['id'],
                    'name'     => $d['name'],
                    'income'   => self::toPln($incomeMinor),
                    'expenses' => self::toPln($expenseMinor),
                ];
            }

            $points[] = [
                'period' => $b['period'],
                'label'  => $b['label'],
                'totals' => [
                    'income'   => self::toPln($totalIncome),
                    'expenses' => self::toPln($totalExpense),
                ],
                'series' => $series,
            ];
        }

        return [
            'dateFrom'    => $query->dateFrom,
            'dateTo'      => $query->dateTo,
            'granularity' => $query->granularity,
            'seriesBy'    => $query->seriesBy,
            'points'      => $points,
        ];
    }

    /**
     * @return list<array{id: string, name: string, kind: string, match: mixed}>
     */
    private function resolveSeriesDescriptors(TrendQuery $query): array
    {
        return match ($query->seriesBy) {
            'description' => array_map(
                static fn (string $t) => ['id' => 'term:' . $t, 'name' => $t, 'kind' => 'description', 'match' => $t],
                $query->terms,
            ),
            'category' => $this->namedDescriptors($query->categoryIds, 'cat', 'category', 'Kategoria'),
            'wallet'   => $this->namedDescriptors($query->walletIds, 'wal', 'wallet', 'Portfel'),
            'concern'  => $this->namedDescriptors($query->concernIds, 'con', 'concern', 'Dotyczy'),
            default    => [['id' => 'total', 'name' => 'Razem', 'kind' => 'none', 'match' => null]],
        };
    }

    /**
     * @param list<int> $ids
     * @return list<array{id: string, name: string, kind: string, match: int}>
     */
    private function namedDescriptors(array $ids, string $prefix, string $kind, string $fallbackLabel): array
    {
        if ($ids === []) {
            return [];
        }

        $table = match ($kind) {
            'category' => 'category',
            'wallet'   => 'wallet',
            'concern'  => 'concern',
        };

        $placeholders = [];
        $params       = [];
        foreach ($ids as $i => $id) {
            $key                = 'id' . $i;
            $placeholders[]     = ':' . $key;
            $params[$key]       = $id;
        }
        $inList = implode(', ', $placeholders);

        $rows = $this->em->getConnection()->fetchAllAssociative(
            "SELECT id, name FROM {$table} WHERE id IN ({$inList})",
            $params,
        );
        $names = [];
        foreach ($rows as $row) {
            $names[(int) $row['id']] = (string) $row['name'];
        }

        return array_map(
            static fn (int $id) => [
                'id'    => $prefix . ':' . $id,
                'name'  => $names[$id] ?? ($fallbackLabel . ' ' . $id),
                'kind'  => $kind,
                'match' => $id,
            ],
            $ids,
        );
    }

    /**
     * @param array{id: string, name: string, kind: string, match: mixed} $descriptor
     * @return list<array{bucket: string, direction: string, amount_minor: int}>
     */
    private function fetchSeriesRows(TrendQuery $query, array $descriptor): array
    {
        [$conditions, $params] = $this->reportItemQuery->buildConditions($query->narrow);

        // Kierunki (trendDirections) — nazwane placeholdery.
        $dirPlaceholders = [];
        foreach ($query->directions as $i => $dir) {
            $key                   = 'dir' . $i;
            $dirPlaceholders[]     = ':' . $key;
            $params[$key]          = $dir;
        }
        $conditions[] = 't.direction IN (' . implode(', ', $dirPlaceholders) . ')';

        // Warunek serii.
        switch ($descriptor['kind']) {
            case 'description':
                $conditions[] = 'LOWER(CONCAT_WS(\' \', '
                    . 't.trans_title, t.trans_description, t.trans_custom_description, '
                    . 't.counterparty_name, ti.description)) LIKE LOWER(:seriesTerm)';
                $params['seriesTerm'] = '%' . trim((string) $descriptor['match']) . '%';
                break;
            case 'category':
                $conditions[]         = 'ti.category_id = :seriesId';
                $params['seriesId']   = (int) $descriptor['match'];
                break;
            case 'wallet':
                $conditions[]         = 'ti.wallet_id = :seriesId';
                $params['seriesId']   = (int) $descriptor['match'];
                break;
            case 'concern':
                $conditions[]         = 'ti.concern_id = :seriesId';
                $params['seriesId']   = (int) $descriptor['match'];
                break;
        }

        $bucketExpr = $this->bucketExpr($query->granularity);
        $where      = implode("\n  AND ", $conditions);

        $sql = <<<SQL
            SELECT
                {$bucketExpr} AS bucket,
                t.direction AS direction,
                SUM(ABS(ti.amount_minor)) AS amount_minor
            FROM transaction_items ti
            INNER JOIN transactions t ON t.id = ti.transaction_id
            WHERE {$where}
            GROUP BY bucket, t.direction
        SQL;

        return $this->em->getConnection()->fetchAllAssociative($sql, $params);
    }

    private function bucketExpr(string $granularity): string
    {
        return match ($granularity) {
            'year'    => "DATE_FORMAT(t.trans_date, '%Y')",
            'quarter' => "CONCAT(YEAR(t.trans_date), '-Q', QUARTER(t.trans_date))",
            default   => "DATE_FORMAT(t.trans_date, '%Y-%m')",
        };
    }

    /**
     * Uzupełnia brakującą granicę okresu na podstawie MIN/MAX dat transakcji pasujących do filtrów.
     *
     * @return array{0: string, 1: string}|null null gdy brak danych do wygenerowania osi czasu
     */
    private function resolveBucketBounds(TrendQuery $query): ?array
    {
        $from = $query->dateFrom;
        $to   = $query->dateTo;

        if ($from !== null && $to !== null) {
            return $from <= $to ? [$from, $to] : null;
        }

        $dataBounds = $this->fetchTransactionDateBounds($query);

        if ($from === null && $to === null) {
            if ($dataBounds === null) {
                return null;
            }

            return [$dataBounds['min'], $dataBounds['max']];
        }

        if ($from === null) {
            $from = $dataBounds['min'] ?? $to;
        }
        if ($to === null) {
            $to = $dataBounds['max'] ?? $from;
        }

        return $from <= $to ? [$from, $to] : null;
    }

    /**
     * @return array{min: string, max: string}|null
     */
    private function fetchTransactionDateBounds(TrendQuery $query): ?array
    {
        [$conditions, $params] = $this->reportItemQuery->buildConditions($query->narrow);

        $dirPlaceholders = [];
        foreach ($query->directions as $i => $dir) {
            $key               = 'dir' . $i;
            $dirPlaceholders[] = ':' . $key;
            $params[$key]      = $dir;
        }
        $conditions[] = 't.direction IN (' . implode(', ', $dirPlaceholders) . ')';

        $where = implode("\n  AND ", $conditions);

        $row = $this->em->getConnection()->fetchAssociative(
            <<<SQL
                SELECT
                    MIN(t.trans_date) AS min_date,
                    MAX(t.trans_date) AS max_date
                FROM transaction_items ti
                INNER JOIN transactions t ON t.id = ti.transaction_id
                WHERE {$where}
            SQL,
            $params,
        );

        if ($row === false || $row['min_date'] === null || $row['max_date'] === null) {
            return null;
        }

        return [
            'min' => (string) $row['min_date'],
            'max' => (string) $row['max_date'],
        ];
    }

    /**
     * @return list<array{period: string, label: string}>
     */
    private function listBuckets(string $dateFrom, string $dateTo, string $granularity): array
    {
        $from = new \DateTimeImmutable($dateFrom);
        $to   = new \DateTimeImmutable($dateTo);
        $buckets = [];

        if ($granularity === 'year') {
            for ($y = (int) $from->format('Y'); $y <= (int) $to->format('Y'); $y++) {
                $buckets[] = ['period' => (string) $y, 'label' => (string) $y];
            }

            return $buckets;
        }

        if ($granularity === 'quarter') {
            $y = (int) $from->format('Y');
            $q = (int) ceil(((int) $from->format('n')) / 3);
            $endY = (int) $to->format('Y');
            $endQ = (int) ceil(((int) $to->format('n')) / 3);
            while ($y < $endY || ($y === $endY && $q <= $endQ)) {
                $buckets[] = [
                    'period' => sprintf('%d-Q%d', $y, $q),
                    'label'  => self::QUARTER_LABELS[$q - 1] ?? ('Q' . $q),
                ];
                $q++;
                if ($q > 4) {
                    $q = 1;
                    $y++;
                }
            }

            return $buckets;
        }

        $cursor = $from->modify('first day of this month');
        $end    = $to->modify('first day of this month');
        while ($cursor <= $end) {
            $month     = (int) $cursor->format('n');
            $buckets[] = [
                'period' => $cursor->format('Y-m'),
                'label'  => self::MONTH_LABELS[$month - 1] ?? $cursor->format('m'),
            ];
            $cursor = $cursor->modify('+1 month');
        }

        return $buckets;
    }

    private static function toPln(int $minor): float
    {
        return round($minor / 100, 2);
    }
}
