<?php



namespace App\Home\Transaction\Service;



use App\Home\Import\DTO\ImportIngestionMode;

use App\Home\Import\DTO\ImportIngestionResult;

use App\Home\Import\Entity\CsvImport;

use App\Home\Import\Entity\CsvImportRow;

use App\Home\Import\Exception\CsvImportDuplicateRowException;

use App\Home\Import\Repository\CsvImportRowRepository;

use App\Home\Transaction\ClassificationRule\Service\ClassificationRuleEngine;

use App\Home\Transaction\Entity\Transaction;

use App\Home\Transaction\Entity\TransactionItem;

use App\Home\Transaction\Repository\TransactionRepository;

use App\Identity\Entity\User;

use Doctrine\ORM\EntityManagerInterface;



class TransactionIngestionService

{

    public function __construct(

        private EntityManagerInterface $em,

        private TransactionRepository $transactionRepository,

        private CsvImportRowRepository $rowRepository,

        private TransactionStatusCalculator $statusCalculator,

        private ClassificationRuleEngine $classificationRuleEngine,

    ) {}



    public function ingestFromImport(

        CsvImport $csvImport,

        User $user,

        ImportIngestionMode $mode = ImportIngestionMode::Strict,

    ): ImportIngestionResult {

        try {

            return $this->em->wrapInTransaction(function () use ($csvImport, $user, $mode): ImportIngestionResult {

                return $this->ingestValidatedRows($csvImport, $user, $mode);

            });

        } catch (\Doctrine\DBAL\Exception\UniqueConstraintViolationException $e) {

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

        $rows = $this->findRowsToProcess($csvImport, $mode);

        // #region agent log
        $this->agentDebugLog('ingest start', [
            'hypothesisId' => 'H2,H4',
            'importId' => $csvImport->getId(),
            'partyId' => $csvImport->getParty()?->getId(),
            'mode' => $mode->value,
            'rowCount' => count($rows),
        ]);
        // #endregion

        $imported   = 0;

        $skipped    = 0;

        $duplicates = 0;



        foreach ($rows as $row) {

            /** @var CsvImportRow $row */

            $existingForRow = $this->transactionRepository->findByImportRow($row);



            if ($existingForRow !== null) {

                if ($mode === ImportIngestionMode::SkipImported) {

                    $row->setParseStatus(CsvImportRow::STATUS_IMPORTED);

                    $skipped++;

                    continue;

                }



                if ($mode === ImportIngestionMode::Reimport) {

                    $this->em->remove($existingForRow);

                } else {

                    throw CsvImportDuplicateRowException::fromRow($row, $existingForRow);

                }

            }



            $duplicate = $this->transactionRepository->findDuplicate(

                $csvImport->getParty(),

                $row->getOperationDate(),

                $row->getAmountMinor() ?? 0,

                $row->getDescriptionRaw(),

            );

            // #region agent log
            if ($imported + $duplicates + $skipped < 3 || $duplicate !== null) {
                $this->agentDebugLog('duplicate check', [
                    'hypothesisId' => 'H2,H3,H4',
                    'rowId' => $row->getId(),
                    'lineNo' => $row->getLineNo(),
                    'partyId' => $csvImport->getParty()?->getId(),
                    'operationDate' => $row->getOperationDate()?->format('Y-m-d'),
                    'amountMinor' => $row->getAmountMinor(),
                    'descriptionLen' => $row->getDescriptionRaw() !== null ? mb_strlen($row->getDescriptionRaw()) : null,
                    'duplicateFound' => $duplicate !== null,
                    'duplicateTxId' => $duplicate?->getId(),
                ]);
            }
            // #endregion



            if ($duplicate !== null) {

                $row->setParseStatus(CsvImportRow::STATUS_DUPLICATE);

                $duplicates++;

                continue;

            }



            $this->createTransactionFromRow($csvImport, $row, $user);

            $row->setParseStatus(CsvImportRow::STATUS_IMPORTED);

            $imported++;

        }



        $csvImport->setStatus(CsvImport::STATUS_IMPORTED);

        $this->em->flush();

        // #region agent log
        $this->agentDebugLog('ingest done', [
            'hypothesisId' => 'H4',
            'importId' => $csvImport->getId(),
            'imported' => $imported,
            'skipped' => $skipped,
            'duplicates' => $duplicates,
        ]);
        // #endregion



        return new ImportIngestionResult($imported, $skipped, $duplicates);

    }



    /** @return CsvImportRow[] */

    private function findRowsToProcess(CsvImport $csvImport, ImportIngestionMode $mode): array

    {

        $statuses = $mode === ImportIngestionMode::Reimport

            ? [CsvImportRow::STATUS_VALIDATED, CsvImportRow::STATUS_IMPORTED]

            : [CsvImportRow::STATUS_VALIDATED];



        return $this->rowRepository->createQueryBuilder('r')

            ->where('r.csvImport = :import')

            ->andWhere('r.parseStatus IN (:statuses)')

            ->setParameter('import', $csvImport)

            ->setParameter('statuses', $statuses)

            ->orderBy('r.lineNo', 'ASC')

            ->getQuery()

            ->getResult();

    }



    private function createTransactionFromRow(CsvImport $csvImport, CsvImportRow $row, User $user): void

    {

        $amountMinor = $row->getAmountMinor() ?? 0;

        $direction   = $amountMinor >= 0

            ? Transaction::DIRECTION_INCOME

            : Transaction::DIRECTION_EXPENSE;



        $tx = new Transaction();

        $tx->setImport($csvImport);

        $tx->setImportRow($row);

        $tx->setOperationDate($row->getOperationDate());

        $tx->setDescription($row->getDescriptionRaw());

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



        $this->classificationRuleEngine->applyToTransaction($tx, $user, overwrite: true);



        if ($tx->getItems()->isEmpty()) {

            $item = new TransactionItem();

            $item->setAmountMinor($amountMinor);

            $item->setCreatedBy($user);

            $item->setUpdatedBy($user);

            $tx->addItem($item);

        }



        $tx->setStatus($this->statusCalculator->calculate($tx));

    }

    /** @param array<string, mixed> $data */
    private function agentDebugLog(string $message, array $data): void
    {
        $payload = json_encode([
            'sessionId' => 'ca6b48',
            'location' => 'TransactionIngestionService.php',
            'message' => $message,
            'data' => $data,
            'timestamp' => (int) (microtime(true) * 1000),
        ], JSON_UNESCAPED_UNICODE);
        if ($payload === false) {
            return;
        }
        $ctx = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/json\r\nX-Debug-Session-Id: ca6b48\r\n",
                'content' => $payload,
                'timeout' => 1,
                'ignore_errors' => true,
            ],
        ]);
        @file_get_contents('http://host.docker.internal:7837/ingest/efae5210-b6ce-4fa0-9427-6c2f8db109a0', false, $ctx);
        @file_put_contents(dirname(__DIR__, 4) . '/debug-ca6b48.log', $payload . "\n", FILE_APPEND);
    }

}


