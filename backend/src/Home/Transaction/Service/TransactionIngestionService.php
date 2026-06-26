<?php



namespace App\Home\Transaction\Service;



use App\Home\Configuration\Entity\Party;

use App\Home\Import\DTO\ImportIngestionMode;

use App\Home\Import\DTO\ImportIngestionResult;

use App\Home\Import\Entity\CsvImport;

use App\Home\Import\Entity\CsvImportRow;

use App\Home\Import\Exception\CsvImportDuplicateRowException;

use App\Home\Import\Repository\CsvImportRowRepository;

use App\Home\Transaction\ClassificationRule\Service\ClassificationRuleEngine;

use App\Home\Transaction\ClassificationRule\ValueObject\PreparedClassificationRules;

use App\Home\Transaction\Entity\Transaction;

use App\Home\Transaction\Entity\TransactionItem;

use App\Home\Transaction\Repository\TransactionRepository;

use App\Home\Report\Settlement\Service\SettlementIndexStateService;

use App\Identity\Entity\User;

use Doctrine\DBAL\Exception\UniqueConstraintViolationException;

use Doctrine\ORM\EntityManagerInterface;



class TransactionIngestionService

{

    private const ROW_BATCH_SIZE = 500;



    public function __construct(

        private EntityManagerInterface $em,

        private TransactionRepository $transactionRepository,

        private CsvImportRowRepository $rowRepository,

        private TransactionStatusCalculator $statusCalculator,

        private ClassificationRuleEngine $classificationRuleEngine,

        private TransactionDeleteService $transactionDeleteService,

        private SettlementIndexStateService $settlementIndexStateService,

    ) {

    }



    public function ingestFromImport(

        CsvImport $csvImport,

        User $user,

        ImportIngestionMode $mode = ImportIngestionMode::Strict,

    ): ImportIngestionResult {

        try {

            return $this->em->wrapInTransaction(function () use ($csvImport, $user, $mode): ImportIngestionResult {

                return $this->ingestValidatedRows($csvImport, $user, $mode);

            });

        } catch (UniqueConstraintViolationException $e) {

            throw CsvImportDuplicateRowException::fromUniqueConstraintViolation(

                $e,

                $this->rowRepository,

                $this->transactionRepository,

            );

        }

    }



    private function ingestValidatedRows(

        CsvImport $csvImport,

        User $user,

        ImportIngestionMode $mode,

    ): ImportIngestionResult {

        $importId = (int) $csvImport->getId();

        $userId = (int) $user->getId();

        $party = $csvImport->getParty();



        $preparedRules = $party !== null

            ? $this->classificationRuleEngine->prepareForParty($party)

            : null;



        /** @var array<string, true> $duplicateLookup */

        $duplicateLookup = $party !== null

            ? $this->buildInitialDuplicateLookup($csvImport, $party)

            : [];



        $skipFindByImportRow = $mode === ImportIngestionMode::Strict

            && $csvImport->getStatus() === CsvImport::STATUS_VALIDATED;



        $imported = 0;

        $skipped = 0;

        $duplicates = 0;

        $afterLineNo = 0;



        while (true) {

            $rows = $this->fetchRowBatch($importId, $mode, $afterLineNo, self::ROW_BATCH_SIZE);

            if ($rows === []) {

                break;

            }



            [$csvImport, $user] = $this->reloadContext($importId, $userId);



            foreach ($rows as $row) {

                /** @var CsvImportRow $row */

                $afterLineNo = (int) $row->getLineNo();



                if (!$skipFindByImportRow) {

                    $existingForRow = $this->transactionRepository->findByImportRow($row);



                    if ($existingForRow !== null) {

                        if ($mode === ImportIngestionMode::SkipImported) {

                            $row->setParseStatus(CsvImportRow::STATUS_IMPORTED);

                            $skipped++;



                            continue;

                        }



                        if ($mode === ImportIngestionMode::Reimport) {

                            $this->transactionDeleteService->delete($existingForRow, $user, false);

                        } else {

                            throw CsvImportDuplicateRowException::fromRow($row, $existingForRow);

                        }

                    }

                }



                $operationDate = $row->getOperationDate();

                $amountMinor = $row->getAmountMinor() ?? 0;

                $counterpartyAccount = $row->getCounterpartyAccountRaw();

                $canonicalText = TransactionRepository::canonicalDuplicateText(

                    $row->getTitleClean(),

                    $row->getDescriptionRaw(),

                );



                if ($operationDate !== null && $this->isDuplicateInLookup(

                    $duplicateLookup,

                    $operationDate,

                    $amountMinor,

                    $counterpartyAccount,

                    $canonicalText,

                )) {

                    $row->setParseStatus(CsvImportRow::STATUS_DUPLICATE);

                    $duplicates++;



                    continue;

                }



                $this->createTransactionFromRow($csvImport, $row, $user, $preparedRules);



                if ($operationDate !== null) {

                    $duplicateLookup[TransactionRepository::duplicateFingerprint(

                        $operationDate,

                        $amountMinor,

                        $counterpartyAccount,

                        $canonicalText,

                    )] = true;

                }



                $row->setParseStatus(CsvImportRow::STATUS_IMPORTED);

                $imported++;

            }



            $this->em->flush();

            $this->em->clear();

        }



        [$csvImport, $user] = $this->reloadContext($importId, $userId);

        $csvImport->setStatus(CsvImport::STATUS_IMPORTED);

        $this->em->flush();



        if ($imported > 0) {

            $this->settlementIndexStateService->markDirty($user);

        }



        return new ImportIngestionResult($imported, $skipped, $duplicates);

    }



    /** @return array<string, true> */

    private function buildInitialDuplicateLookup(CsvImport $csvImport, Party $party): array

    {

        [$dateFrom, $dateTo] = $this->resolveDuplicateDateRange((int) $csvImport->getId(), $csvImport);



        return $this->transactionRepository->buildDuplicateLookup($party, $dateFrom, $dateTo);

    }



    /** @return array{0: \DateTimeImmutable, 1: \DateTimeImmutable} */

    private function resolveDuplicateDateRange(int $importId, CsvImport $csvImport): array

    {

        [$rowMin, $rowMax] = $this->fetchImportRowOperationDateRange($importId);



        $from = $csvImport->getPeriodFrom()?->setTime(0, 0);

        $to   = $csvImport->getPeriodTo()?->setTime(0, 0);



        if ($from !== null && $to !== null) {

            if ($rowMin !== null && $rowMin < $from) {

                $from = $rowMin;

            }

            if ($rowMax !== null && $rowMax > $to) {

                $to = $rowMax;

            }



            return [$from, $to];

        }



        if ($rowMin !== null && $rowMax !== null) {

            return [$rowMin, $rowMax];

        }



        $today = new \DateTimeImmutable('today');



        return [$today, $today];

    }



    /** @return array{0: ?\DateTimeImmutable, 1: ?\DateTimeImmutable} */

    private function fetchImportRowOperationDateRange(int $importId): array

    {

        $result = $this->rowRepository

            ->createQueryBuilder('r')

            ->select('MIN(r.operationDate) AS minDate, MAX(r.operationDate) AS maxDate')

            ->join('r.csvImport', 'i')

            ->where('i.id = :importId')

            ->andWhere('r.operationDate IS NOT NULL')

            ->setParameter('importId', $importId)

            ->getQuery()

            ->getOneOrNullResult();



        if (!is_array($result) || $result['minDate'] === null || $result['maxDate'] === null) {

            return [null, null];

        }



        $minDate = $this->normalizeQueryDate($result['minDate']);

        $maxDate = $this->normalizeQueryDate($result['maxDate']);



        if ($minDate === null || $maxDate === null) {

            return [null, null];

        }



        return [$minDate->setTime(0, 0), $maxDate->setTime(0, 0)];

    }



    private function normalizeQueryDate(mixed $value): ?\DateTimeImmutable

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



    /** @param array<string, true> $duplicateLookup */

    private function isDuplicateInLookup(

        array $duplicateLookup,

        \DateTimeImmutable $operationDate,

        int $amountMinor,

        ?string $counterpartyAccount,

        ?string $canonicalText,

    ): bool {

        $fingerprint = TransactionRepository::duplicateFingerprint(

            $operationDate,

            $amountMinor,

            $counterpartyAccount,

            $canonicalText,

        );



        return isset($duplicateLookup[$fingerprint]);

    }



    /** @return CsvImportRow[] */

    private function fetchRowBatch(

        int $importId,

        ImportIngestionMode $mode,

        int $afterLineNo,

        int $limit,

    ): array {

        $statuses = $mode === ImportIngestionMode::Reimport

            ? [CsvImportRow::STATUS_VALIDATED, CsvImportRow::STATUS_IMPORTED]

            : [CsvImportRow::STATUS_VALIDATED];



        $qb = $this->rowRepository

            ->createQueryBuilder('r')

            ->join('r.csvImport', 'i')

            ->where('i.id = :importId')

            ->andWhere('r.parseStatus IN (:statuses)')

            ->setParameter('importId', $importId)

            ->setParameter('statuses', $statuses)

            ->orderBy('r.lineNo', 'ASC')

            ->setMaxResults($limit);



        if ($afterLineNo > 0) {

            $qb->andWhere('r.lineNo > :afterLineNo')

                ->setParameter('afterLineNo', $afterLineNo);

        }



        return $qb->getQuery()->getResult();

    }



    /** @return array{0: CsvImport, 1: User} */

    private function reloadContext(int $importId, int $userId): array

    {

        $csvImport = $this->em->find(CsvImport::class, $importId);

        if ($csvImport === null) {

            throw new \RuntimeException("CsvImport {$importId} not found.");

        }



        $user = $this->em->find(User::class, $userId);

        if ($user === null) {

            throw new \RuntimeException("User {$userId} not found.");

        }



        return [$csvImport, $user];

    }



    private function createTransactionFromRow(

        CsvImport $csvImport,

        CsvImportRow $row,

        User $user,

        ?PreparedClassificationRules $preparedRules,

    ): void {

        $amountMinor = $row->getAmountMinor() ?? 0;

        $direction = $amountMinor >= 0

            ? Transaction::DIRECTION_INCOME

            : Transaction::DIRECTION_EXPENSE;



        $tx = new Transaction();

        $tx->setImport($csvImport);

        $tx->setImportRow($row);

        $tx->setTransDate($row->getOperationDate());

        $tx->setBookingDate($row->getBookingDate());

        $tx->setTransTitle($row->getTitleClean());

        $tx->setTransDescription($row->getDescriptionRaw());

        $tx->setBalanceAfterMinor($row->getBalanceAfterMinor());

        $tx->setCounterpartyName($row->getCounterpartyNameRaw());

        $tx->setAmountMinor($amountMinor);

        $tx->setDirection($direction);

        $tx->setCounterpartyAccountNumber($row->getCounterpartyAccountRaw());



        $party = $csvImport->getParty();



        if ($party !== null) {

            if ($direction === Transaction::DIRECTION_EXPENSE) {

                $tx->setPaidFromParty($party);

            } else {

                $tx->setPaidToParty($party);

            }

        }



        $tx->setSource(Transaction::SOURCE_CSV);

        $tx->setCreatedBy($user);

        $tx->setUpdatedBy($user);



        $this->em->persist($tx);



        $this->classificationRuleEngine->applyToTransaction(

            $tx,

            $user,

            overwrite: true,

            prepared: $preparedRules,

        );



        if ($tx->getItems()->isEmpty()) {

            $item = new TransactionItem();

            $item->setAmountMinor($amountMinor);

            $item->setCreatedBy($user);

            $item->setUpdatedBy($user);



            $tx->addItem($item);

        }



        $tx->setStatus($this->statusCalculator->calculate($tx));

    }

}


