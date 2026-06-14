<?php

namespace App\Home\Transaction\Service;

use App\Home\Import\Entity\CsvImport;
use App\Home\Import\Entity\CsvImportRow;
use App\Home\Import\Repository\CsvImportRowRepository;
use App\Home\Transaction\ClassificationRule\Service\ClassificationRuleEngine;
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

    /**
     * Creates Transaction records for all VALIDATED rows in the given import.
     * Sets parseStatus to IMPORTED or DUPLICATE per row, then marks the import IMPORTED.
     */
    public function ingestFromImport(CsvImport $csvImport, User $user): void
    {
        $rows = $this->rowRepository->findBy([
            'csvImport'   => $csvImport,
            'parseStatus' => CsvImportRow::STATUS_VALIDATED,
        ]);

        foreach ($rows as $row) {
            /** @var CsvImportRow $row */
            $duplicate = $this->transactionRepository->findDuplicate(
                $csvImport->getParty(),
                $row->getOperationDate(),
                $row->getAmountMinor() ?? 0,
                $row->getDescriptionRaw(),
            );

            if ($duplicate !== null) {
                $row->setParseStatus(CsvImportRow::STATUS_DUPLICATE);
                continue;
            }

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

            $item = new TransactionItem();
            $item->setAmountMinor($amountMinor);
            $item->setCreatedBy($user);
            $item->setUpdatedBy($user);
            $tx->addItem($item);

            $tx->setStatus($this->statusCalculator->calculate($tx));

            $this->em->persist($tx);

            $this->classificationRuleEngine->applyToTransaction($tx, $user, overwrite: false);

            $row->setParseStatus(CsvImportRow::STATUS_IMPORTED);
        }

        $csvImport->setStatus(CsvImport::STATUS_IMPORTED);
        $this->em->flush();
    }
}
