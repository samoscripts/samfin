<?php

namespace App\Home\Transaction\Repository;

use App\Home\Configuration\Entity\Party;
use App\Home\Import\Entity\CsvImportRow;
use App\Home\Transaction\Entity\Transaction;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\QueryBuilder;
use Doctrine\Persistence\ManagerRegistry;

class TransactionRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Transaction::class);
    }

    /**
     * Returns paginated transactions matching all supplied filters.
     *
     * @return array{items: Transaction[], total: int}
     */
    public function findPaged(
        array  $filters,
        string $sortField,
        string $sortDir,
        int    $page,
        int    $perPage,
    ): array {
        $needsItemJoin = !empty($filters['walletId'])
            || !empty($filters['concernId'])
            || !empty($filters['categoryId']);

        $cqb = $this->createQueryBuilder('t')
            ->select('COUNT(DISTINCT t.id)');

        if ($needsItemJoin) {
            $cqb->leftJoin('t.items', 'ti');
        }

        $this->applyFilters($cqb, $filters, $needsItemJoin);

        $total = (int) $cqb->getQuery()->getSingleScalarResult();

        if ($total === 0) {
            return ['items' => [], 'total' => 0];
        }

        $allowedSortFields = [
            'date'   => 't.transDate',
            'amount' => 't.amountMinor',
        ];
        $orderExpr = $allowedSortFields[$sortField] ?? 't.transDate';
        $orderDir  = strtoupper($sortDir) === 'ASC' ? 'ASC' : 'DESC';

        $iqb = $this->createQueryBuilder('t')
            ->select('DISTINCT t.id')
            ->orderBy($orderExpr, $orderDir)
            ->setFirstResult(($page - 1) * $perPage)
            ->setMaxResults($perPage);

        if ($needsItemJoin) {
            $iqb->leftJoin('t.items', 'ti');
        }

        $this->applyFilters($iqb, $filters, $needsItemJoin);

        $ids = array_column($iqb->getQuery()->getScalarResult(), 'id');

        if (empty($ids)) {
            return ['items' => [], 'total' => $total];
        }

        $items = $this->createQueryBuilder('t')
            ->addSelect('ti', 'pfp', 'ptp', 'w', 'con', 'cat')
            ->leftJoin('t.items', 'ti')
            ->leftJoin('t.paidFromParty', 'pfp')
            ->leftJoin('t.paidToParty', 'ptp')
            ->leftJoin('ti.wallet', 'w')
            ->leftJoin('ti.concern', 'con')
            ->leftJoin('ti.category', 'cat')
            ->where('t.id IN (:ids)')
            ->setParameter('ids', $ids)
            ->orderBy($orderExpr, $orderDir)
            ->getQuery()
            ->getResult();

        return ['items' => $items, 'total' => $total];
    }

    /** @return array{income: float, expenses: float, balance: float, unclassifiedCount: int} */
    public function getStats(?string $dateFrom, ?string $dateTo): array
    {
        return $this->getPeriodStats([
            'dateFrom' => $dateFrom,
            'dateTo'   => $dateTo,
        ]);
    }

    /**
     * @param array<string, mixed> $filters
     */
    public function getPeriodStats(array $filters): array
    {
        $needsItemJoin = !empty($filters['walletId'])
            || !empty($filters['concernId'])
            || !empty($filters['categoryId']);

        $qb = $this->createQueryBuilder('t');

        if ($needsItemJoin) {
            $qb->leftJoin('t.items', 'ti');
        }

        $this->applyFilters($qb, $filters, $needsItemJoin);

        $rows = $qb->select(
            "SUM(CASE WHEN t.direction = 'INCOME'  THEN t.amountMinor ELSE 0 END) AS income_minor",
            "SUM(CASE WHEN t.direction = 'EXPENSE' THEN ABS(t.amountMinor) ELSE 0 END) AS expense_minor",
            "SUM(CASE WHEN t.status = 'UNCLASSIFIED' THEN 1 ELSE 0 END) AS unclassified",
            'COUNT(DISTINCT t.id) AS tx_count',
        )
            ->getQuery()
            ->getOneOrNullResult();

        $incomeMinor  = (int) ($rows['income_minor']  ?? 0);
        $expenseMinor = (int) ($rows['expense_minor'] ?? 0);
        $unclassified = (int) ($rows['unclassified']  ?? 0);
        $txCount      = (int) ($rows['tx_count']      ?? 0);

        return [
            'income'            => round($incomeMinor / 100, 2),
            'expenses'          => round($expenseMinor / 100, 2),
            'balance'           => round(($incomeMinor - $expenseMinor) / 100, 2),
            'unclassifiedCount' => $unclassified,
            'transactionCount'  => $txCount,
        ];
    }

    public function countAll(): int
    {
        return (int) $this->createQueryBuilder('t')
            ->select('COUNT(t.id)')
            ->getQuery()
            ->getSingleScalarResult();
    }

    /**
     * @return Transaction[]
     */
    public function findBatchForExport(int $offset, int $limit): array
    {
        return $this->createQueryBuilder('t')
            ->addSelect('ti', 'pfp', 'ptp', 'w', 'con', 'cat')
            ->leftJoin('t.items', 'ti')
            ->leftJoin('t.paidFromParty', 'pfp')
            ->leftJoin('t.paidToParty', 'ptp')
            ->leftJoin('ti.wallet', 'w')
            ->leftJoin('ti.concern', 'con')
            ->leftJoin('ti.category', 'cat')
            ->orderBy('t.id', 'ASC')
            ->setFirstResult($offset)
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    public function findDuplicate(
        ?Party $party,
        ?\DateTimeImmutable $operationDate,
        int $amountMinor,
        ?string $counterpartyAccount,
        ?string $canonicalText,
    ): ?Transaction {
        if ($party === null || $operationDate === null) {
            return null;
        }

        $dateOnly = $operationDate->setTime(0, 0);
        $fingerprint = self::duplicateFingerprint(
            $dateOnly,
            $amountMinor,
            $counterpartyAccount,
            $canonicalText,
        );

        $rows = $this->createQueryBuilder('t')
            ->select('t')
            ->join('t.import', 'i')
            ->where('i.party = :party')
            ->andWhere('t.transDate = :date')
            ->andWhere('t.amountMinor = :amount')
            ->setParameter('party', $party)
            ->setParameter('date', $dateOnly)
            ->setParameter('amount', $amountMinor)
            ->getQuery()
            ->getResult();

        foreach ($rows as $tx) {
            if (!$tx instanceof Transaction) {
                continue;
            }

            $candidate = self::duplicateFingerprint(
                $dateOnly,
                $amountMinor,
                $tx->getCounterpartyAccountNumber(),
                self::canonicalDuplicateText(
                    $tx->getTransTitle(),
                    $tx->getTransDescription(),
                ),
            );

            if ($candidate === $fingerprint) {
                return $tx;
            }
        }

        return null;
    }

    /**
     * @return array<string, true> fingerprint => true
     */
    public function buildDuplicateLookup(
        Party $party,
        \DateTimeImmutable $dateFrom,
        \DateTimeImmutable $dateTo,
    ): array {
        $rows = $this->createQueryBuilder('t')
            ->select('t.transDate, t.amountMinor, t.transTitle, t.transDescription, t.counterpartyAccountNumber')
            ->join('t.import', 'i')
            ->where('i.party = :party')
            ->andWhere('t.transDate >= :dateFrom')
            ->andWhere('t.transDate <= :dateTo')
            ->setParameter('party', $party)
            ->setParameter('dateFrom', $dateFrom->setTime(0, 0))
            ->setParameter('dateTo', $dateTo->setTime(0, 0))
            ->getQuery()
            ->getArrayResult();

        $lookup = [];
        foreach ($rows as $row) {
            $immutable = self::normalizeOperationDate($row['transDate'] ?? null);
            if ($immutable === null) {
                continue;
            }

            $fingerprint = self::duplicateFingerprint(
                $immutable,
                (int) $row['amountMinor'],
                $row['counterpartyAccountNumber'] ?? null,
                self::canonicalDuplicateText(
                    $row['transTitle'] ?? null,
                    $row['transDescription'] ?? null,
                ),
            );
            $lookup[$fingerprint] = true;
        }

        return $lookup;
    }

    public static function canonicalDuplicateText(
        ?string $transTitle,
        ?string $transDescription,
    ): string {
        $candidate = $transTitle ?? $transDescription ?? '';

        return mb_strtolower(trim($candidate));
    }

    public static function duplicateFingerprint(
        \DateTimeImmutable $operationDate,
        int $amountMinor,
        ?string $counterpartyAccount,
        ?string $canonicalText,
    ): string {
        $dateOnly = $operationDate->setTime(0, 0);
        $account  = $counterpartyAccount ?? '';
        $text     = mb_strtolower(trim($canonicalText ?? ''));

        return $dateOnly->format('Y-m-d') . '|' . $amountMinor . '|' . $account . '|' . $text;
    }

    private static function normalizeOperationDate(mixed $value): ?\DateTimeImmutable
    {
        if ($value instanceof \DateTimeImmutable) {
            return $value;
        }
        if ($value instanceof \DateTimeInterface) {
            return \DateTimeImmutable::createFromInterface($value);
        }
        if (is_string($value) && $value !== '') {
            return new \DateTimeImmutable($value);
        }

        return null;
    }

    public function findByImportRow(CsvImportRow $row): ?Transaction
    {
        return $this->findOneBy(['importRow' => $row]);
    }

    private function applyFilters(QueryBuilder $qb, array $f, bool $itemJoined): void
    {
        if (!empty($f['dateFrom'])) {
            $qb->andWhere('t.transDate >= :dateFrom')
               ->setParameter('dateFrom', new \DateTimeImmutable($f['dateFrom']));
        }
        if (!empty($f['dateTo'])) {
            $qb->andWhere('t.transDate <= :dateTo')
               ->setParameter('dateTo', new \DateTimeImmutable($f['dateTo']));
        }
        if (!empty($f['direction'])) {
            $directions = $this->parseFilterList($f['direction']);
            if ($directions !== []) {
                $qb->andWhere('t.direction IN (:directions)')
                   ->setParameter('directions', $directions);
            }
        }
        if (!empty($f['status'])) {
            $statuses = $this->parseFilterList($f['status']);
            if ($statuses !== []) {
                $qb->andWhere('t.status IN (:statuses)')
                   ->setParameter('statuses', $statuses);
            }
        }
        if (!empty($f['paidFromPartyId'])) {
            $qb->andWhere('t.paidFromParty = :paidFromPartyId')
               ->setParameter('paidFromPartyId', (int) $f['paidFromPartyId']);
        }
        if (!empty($f['paidToPartyId'])) {
            $qb->andWhere('t.paidToParty = :paidToPartyId')
               ->setParameter('paidToPartyId', (int) $f['paidToPartyId']);
        }
        if ($itemJoined && !empty($f['walletId'])) {
            $qb->andWhere('ti.wallet = :walletId')
               ->setParameter('walletId', (int) $f['walletId']);
        }
        if ($itemJoined && !empty($f['concernId'])) {
            $qb->andWhere('ti.concern = :concernId')
               ->setParameter('concernId', (int) $f['concernId']);
        }
        if ($itemJoined && !empty($f['categoryId'])) {
            $qb->andWhere('ti.category = :categoryId')
               ->setParameter('categoryId', (int) $f['categoryId']);
        }
        if (isset($f['amountMin']) && $f['amountMin'] !== '') {
            $minMinor = (int) round((float) str_replace(',', '.', (string) $f['amountMin']) * 100);
            $qb->andWhere('ABS(t.amountMinor) >= :amountMin')
               ->setParameter('amountMin', $minMinor);
        }
        if (isset($f['amountMax']) && $f['amountMax'] !== '') {
            $maxMinor = (int) round((float) str_replace(',', '.', (string) $f['amountMax']) * 100);
            $qb->andWhere('ABS(t.amountMinor) <= :amountMax')
               ->setParameter('amountMax', $maxMinor);
        }
        if (!empty($f['description'])) {
            $needle = '%' . trim((string) $f['description']) . '%';
            $qb->andWhere(
                'LOWER(t.transDescription) LIKE LOWER(:description)
                OR LOWER(t.transTitle) LIKE LOWER(:description)
                OR LOWER(t.counterpartyName) LIKE LOWER(:description)',
            )->setParameter('description', $needle);
        }
    }

    /**
     * @return int[]
     */
    public function findIdsForFilters(array $filters, int $limit): array
    {
        $needsItemJoin = !empty($filters['walletId'])
            || !empty($filters['concernId'])
            || !empty($filters['categoryId']);

        $qb = $this->createQueryBuilder('t')
            ->select('DISTINCT t.id')
            ->orderBy('t.id', 'ASC')
            ->setMaxResults($limit);

        if ($needsItemJoin) {
            $qb->leftJoin('t.items', 'ti');
        }

        $this->applyFilters($qb, $filters, $needsItemJoin);

        return array_map('intval', array_column($qb->getQuery()->getScalarResult(), 'id'));
    }

    /** @return list<string> */
    private function parseFilterList(mixed $value): array
    {
        if ($value === null || $value === '') {
            return [];
        }

        $items = is_array($value)
            ? $value
            : explode(',', (string) $value);

        return array_values(array_filter(
            array_map('trim', array_map('strval', $items)),
            static fn (string $v) => $v !== '',
        ));
    }
}
