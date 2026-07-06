<?php

namespace App\Home\Report\Settlement\Repository;

use Doctrine\ORM\EntityManagerInterface;

class SettlementItemQuery
{
    public function __construct(
        private EntityManagerInterface $em,
    ) {}

    /**
     * @return list<array{
     *   transactionId: int,
     *   itemId: int,
     *   operationDate: string,
     *   direction: string,
     *   status: string,
     *   description: ?string,
     *   paidFromPartyId: ?int,
     *   paidFrom: ?string,
     *   paidToPartyId: ?int,
     *   paidTo: ?string,
     *   walletId: ?int,
     *   wallet: ?string,
     *   amountMinor: int,
     * }>
     */
    public function fetchItemsForPeriod(
        string $dateFrom,
        string $dateTo,
        int $settlementPartyId,
        bool $includePartial,
        int $homeBudgetWalletId,
        array $maciekSourcePartyIds,
        array $basiaSourcePartyIds,
    ): array {
        $statusFilter = $includePartial
            ? "t.status IN ('CLASSIFIED', 'PARTIALLY_CLASSIFIED')"
            : "t.status = 'CLASSIFIED'";

        [$partyFilterSql, $partyFilterParams] = $this->buildPartyFilterSql(
            $settlementPartyId,
            $homeBudgetWalletId,
            $maciekSourcePartyIds,
            $basiaSourcePartyIds,
        );

        $sql = <<<SQL
            SELECT
                t.id AS transactionId,
                ti.id AS itemId,
                t.trans_date AS operationDate,
                t.direction AS direction,
                t.status AS status,
                COALESCE(NULLIF(TRIM(t.trans_title), ''), t.trans_description) AS description,
                pfp.id AS paidFromPartyId,
                pfp.name AS paidFrom,
                ptp.id AS paidToPartyId,
                ptp.name AS paidTo,
                w.id AS walletId,
                w.name AS wallet,
                ti.amount_minor AS amountMinor
            FROM transaction_items ti
            INNER JOIN transactions t ON t.id = ti.transaction_id
            LEFT JOIN party pfp ON pfp.id = t.paid_from_party_id
            LEFT JOIN party ptp ON ptp.id = t.paid_to_party_id
            LEFT JOIN wallet w ON w.id = ti.wallet_id
            WHERE t.trans_date >= :dateFrom
              AND t.trans_date <= :dateTo
              AND {$statusFilter}
              AND ({$partyFilterSql})
            ORDER BY t.trans_date ASC, t.id ASC, ti.id ASC
        SQL;

        $rows = $this->em->getConnection()->fetchAllAssociative($sql, array_merge([
            'dateFrom' => $dateFrom,
            'dateTo'   => $dateTo,
        ], $partyFilterParams));

        return array_map(static function (array $row): array {
            return [
                'transactionId'   => (int) $row['transactionId'],
                'itemId'          => (int) $row['itemId'],
                'operationDate'   => $row['operationDate'],
                'direction'       => $row['direction'],
                'status'          => $row['status'],
                'description'     => $row['description'],
                'paidFromPartyId' => $row['paidFromPartyId'] !== null ? (int) $row['paidFromPartyId'] : null,
                'paidFrom'        => $row['paidFrom'],
                'paidToPartyId'   => $row['paidToPartyId'] !== null ? (int) $row['paidToPartyId'] : null,
                'paidTo'          => $row['paidTo'],
                'walletId'        => $row['walletId'] !== null ? (int) $row['walletId'] : null,
                'wallet'          => $row['wallet'],
                'amountMinor'     => (int) $row['amountMinor'],
            ];
        }, $rows);
    }

    /**
     * @return list<array{
     *   transactionId: int,
     *   itemId: int,
     *   operationDate: string,
     *   direction: string,
     *   status: string,
     *   description: ?string,
     *   paidFromPartyId: ?int,
     *   paidFrom: ?string,
     *   paidToPartyId: ?int,
     *   paidTo: ?string,
     *   walletId: ?int,
     *   wallet: ?string,
     *   amountMinor: int,
     * }>
     */
    public function fetchItemsFromDate(
        string $dateFrom,
        int $settlementPartyId,
        bool $includePartial,
        int $homeBudgetWalletId,
        array $maciekSourcePartyIds,
        array $basiaSourcePartyIds,
    ): array {
        $statusFilter = $includePartial
            ? "t.status IN ('CLASSIFIED', 'PARTIALLY_CLASSIFIED')"
            : "t.status = 'CLASSIFIED'";

        [$partyFilterSql, $partyFilterParams] = $this->buildPartyFilterSql(
            $settlementPartyId,
            $homeBudgetWalletId,
            $maciekSourcePartyIds,
            $basiaSourcePartyIds,
        );

        $sql = <<<SQL
            SELECT
                t.id AS transactionId,
                ti.id AS itemId,
                t.trans_date AS operationDate,
                t.direction AS direction,
                t.status AS status,
                COALESCE(NULLIF(TRIM(t.trans_title), ''), t.trans_description) AS description,
                pfp.id AS paidFromPartyId,
                pfp.name AS paidFrom,
                ptp.id AS paidToPartyId,
                ptp.name AS paidTo,
                w.id AS walletId,
                w.name AS wallet,
                ti.amount_minor AS amountMinor
            FROM transaction_items ti
            INNER JOIN transactions t ON t.id = ti.transaction_id
            LEFT JOIN party pfp ON pfp.id = t.paid_from_party_id
            LEFT JOIN party ptp ON ptp.id = t.paid_to_party_id
            LEFT JOIN wallet w ON w.id = ti.wallet_id
            WHERE t.trans_date >= :dateFrom
              AND {$statusFilter}
              AND ({$partyFilterSql})
            ORDER BY t.trans_date ASC, t.id ASC, ti.id ASC
        SQL;

        $rows = $this->em->getConnection()->fetchAllAssociative($sql, array_merge([
            'dateFrom' => $dateFrom,
        ], $partyFilterParams));

        return array_map(static function (array $row): array {
            return [
                'transactionId'   => (int) $row['transactionId'],
                'itemId'          => (int) $row['itemId'],
                'operationDate'   => $row['operationDate'],
                'direction'       => $row['direction'],
                'status'          => $row['status'],
                'description'     => $row['description'],
                'paidFromPartyId' => $row['paidFromPartyId'] !== null ? (int) $row['paidFromPartyId'] : null,
                'paidFrom'        => $row['paidFrom'],
                'paidToPartyId'   => $row['paidToPartyId'] !== null ? (int) $row['paidToPartyId'] : null,
                'paidTo'          => $row['paidTo'],
                'walletId'        => $row['walletId'] !== null ? (int) $row['walletId'] : null,
                'wallet'          => $row['wallet'],
                'amountMinor'     => (int) $row['amountMinor'],
            ];
        }, $rows);
    }

    /**
     * @return array{person: string, transactionId: int, operationDate: string, amountMinor: int}|null
     */
    public function findLastStandardDeposit(
        string $dateTo,
        int $settlementPartyId,
        int $homeBudgetWalletId,
        array $maciekSourcePartyIds,
        array $basiaSourcePartyIds,
    ): ?array {
        if ($maciekSourcePartyIds === [] && $basiaSourcePartyIds === []) {
            return null;
        }

        $allIds = array_merge($maciekSourcePartyIds, $basiaSourcePartyIds);
        $placeholders = implode(',', array_fill(0, count($allIds), '?'));

        $sql = <<<SQL
            SELECT
                t.id AS transactionId,
                t.trans_date AS operationDate,
                ti.amount_minor AS amountMinor,
                t.paid_from_party_id AS paidFromPartyId
            FROM transaction_items ti
            INNER JOIN transactions t ON t.id = ti.transaction_id
            WHERE t.direction = 'INCOME'
              AND t.paid_to_party_id = ?
              AND t.paid_from_party_id IN ({$placeholders})
              AND ti.wallet_id = ?
              AND t.trans_date <= ?
              AND t.paid_from_party_id IS NOT NULL
            ORDER BY t.trans_date DESC, t.id DESC
            LIMIT 1
        SQL;

        $params = array_merge(
            [$settlementPartyId],
            $allIds,
            [$homeBudgetWalletId, $dateTo],
        );

        $row = $this->em->getConnection()->fetchAssociative($sql, $params);
        if ($row === false) {
            return null;
        }

        $fromId = (int) $row['paidFromPartyId'];
        $person = in_array($fromId, $maciekSourcePartyIds, true)
            ? 'maciek'
            : 'basia';

        return [
            'person'          => $person,
            'transactionId'   => (int) $row['transactionId'],
            'operationDate'   => $row['operationDate'],
            'amountMinor'     => (int) $row['amountMinor'],
        ];
    }

    /**
     * @param list<int> $maciekSourcePartyIds
     * @param list<int> $basiaSourcePartyIds
     *
     * @return array{0: string, 1: array<string, int>}
     */
    private function buildPartyFilterSql(
        int $settlementPartyId,
        int $homeBudgetWalletId,
        array $maciekSourcePartyIds,
        array $basiaSourcePartyIds,
    ): array {
        $clauses = [
            't.paid_from_party_id = :settlementPartyId',
            't.paid_to_party_id = :settlementPartyId',
        ];
        $params = ['settlementPartyId' => $settlementPartyId];

        $sourceIds = array_values(array_unique(array_merge($maciekSourcePartyIds, $basiaSourcePartyIds)));
        if ($sourceIds !== []) {
            $placeholders = [];
            foreach ($sourceIds as $i => $id) {
                $key = 'sourcePartyId' . $i;
                $placeholders[] = ':' . $key;
                $params[$key] = $id;
            }
            $inList = implode(', ', $placeholders);
            $clauses[] = <<<SQL
                (t.direction = 'EXPENSE'
                 AND ti.wallet_id = :homeBudgetWalletId
                 AND t.paid_from_party_id IN ({$inList})
                 AND t.paid_from_party_id != :settlementPartyId)
            SQL;
            $params['homeBudgetWalletId'] = $homeBudgetWalletId;
        }

        return [implode(' OR ', $clauses), $params];
    }
}
