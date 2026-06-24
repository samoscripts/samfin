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
            'date'   => 't.operationDate',
            'amount' => 't.amountMinor',
        ];
        $orderExpr = $allowedSortFields[$sortField] ?? 't.operationDate';
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
        ?string $description,
    ): ?Transaction {
        if ($party === null || $operationDate === null) {
            return null;
        }

        // csv_import_row stores DATETIME (often with spurious time); transactions use DATE only.
        $dateOnly = $operationDate->setTime(0, 0);

        return $this->createQueryBuilder('t')
            ->join('t.import', 'i')
            ->where('i.party = :party')
            ->andWhere('t.operationDate = :date')
            ->andWhere('t.amountMinor = :amount')
            ->andWhere('t.description = :description')
            ->setParameter('party', $party)
            ->setParameter('date', $dateOnly)
            ->setParameter('amount', $amountMinor)
            ->setParameter('description', $description)
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    public function findByImportRow(CsvImportRow $row): ?Transaction
    {
        return $this->findOneBy(['importRow' => $row]);
    }

    private function applyFilters(QueryBuilder $qb, array $f, bool $itemJoined): void
    {
        if (!empty($f['dateFrom'])) {
            $qb->andWhere('t.operationDate >= :dateFrom')
               ->setParameter('dateFrom', new \DateTimeImmutable($f['dateFrom']));
        }
        if (!empty($f['dateTo'])) {
            $qb->andWhere('t.operationDate <= :dateTo')
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
            $minMinor = (int) round((float) $f['amountMin'] * 100);
            $qb->andWhere('ABS(t.amountMinor) >= :amountMin')
               ->setParameter('amountMin', $minMinor);
        }
        if (isset($f['amountMax']) && $f['amountMax'] !== '') {
            $maxMinor = (int) round((float) $f['amountMax'] * 100);
            $qb->andWhere('ABS(t.amountMinor) <= :amountMax')
               ->setParameter('amountMax', $maxMinor);
        }
        if (!empty($f['description'])) {
            $qb->andWhere('LOWER(t.description) LIKE LOWER(:description)')
               ->setParameter('description', '%' . trim((string) $f['description']) . '%');
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
