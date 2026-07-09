<?php

namespace App\Home\Import\Service;

use App\Home\Configuration\General\Repository\PartyBankAccountRepository;
use App\Home\Import\DTO\ImportErrorData;
use App\Home\Import\DTO\NormalizedImportRow;
use App\Home\Import\Entity\CsvImport;
use App\Home\Import\Entity\CsvImportError;
use App\Home\Import\Entity\CsvImportRow;
use App\Home\Import\Provider\BankImportProviderRegistry;
use App\Identity\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\Persistence\ManagerRegistry;
use Psr\Log\LoggerInterface;

class CsvImportService
{
    private const ROW_BATCH_SIZE = 500;

    private EntityManagerInterface $em;

    public function __construct(
        EntityManagerInterface              $em,
        private readonly ManagerRegistry    $managerRegistry,
        private readonly BankImportProviderRegistry  $providerRegistry,
        private readonly PartyBankAccountRepository  $partyBankAccountRepository,
        private readonly LoggerInterface             $logger,
    ) {
        $this->em = $em;
    }

    public function import(
        string  $source,
        string  $filePath,
        ?string $originalFilename,
        User    $user,
    ): CsvImport {
        $csvImport = new CsvImport();
        $csvImport->setSource($source);
        $csvImport->setStatus(CsvImport::STATUS_PENDING);
        $csvImport->setOriginalFilename($originalFilename);
        $csvImport->setFileSha256(hash_file('sha256', $filePath) ?: '');
        $csvImport->setCreatedBy($user);
        $csvImport->setUpdatedBy($user);

        $this->em->persist($csvImport);
        $this->em->flush();

        $importId = (int)$csvImport->getId();

        try {
            $provider = $this->providerRegistry->get($source);
            $result   = $provider->parseFile($filePath);

            $csvImport = $this->requireImport($importId);
            $csvImport->setDetectedClientName($result->detectedClientName);
            $csvImport->setDetectedAccountNumber($result->detectedAccountNumber);
            $csvImport->setDetectedAccountDisplay($result->detectedAccountDisplay);
            $csvImport->setPeriodFrom($result->periodFrom);
            $csvImport->setPeriodTo($result->periodTo);
            $csvImport->setCsvFormat($result->csvFormat?->value);

            $businessErrors = [];

            if ($result->headerValid) {
                $businessErrors = $this->validateAgainstDatabase(
                    $result->detectedAccountNumber,
                    $result->detectedClientName,
                    $csvImport,
                );
            }

            $allErrors = array_merge($result->errors, $businessErrors);
            foreach ($allErrors as $errorData) {
                /** @var ImportErrorData $errorData */
                $err = new CsvImportError();
                $err->setCsvImport($csvImport);
                $err->setScope($errorData->scope);
                $err->setLineNo($errorData->lineNo);
                $err->setCode($errorData->code);
                $err->setMessage($errorData->message);
                $this->em->persist($err);
            }

            if ($allErrors !== []) {
                $this->em->flush();
            }

            $rowsTotal   = count($result->rows);
            $rowsInvalid = 0;
            $batchCount  = 0;

            foreach ($result->rows as $rowData) {
                /** @var NormalizedImportRow $rowData */
                $csvImport = $this->requireImport($importId);

                $row = new CsvImportRow();
                $row->setCsvImport($csvImport);
                $row->setCsvFormat($rowData->csvFormat->value);
                $row->setLineNo($rowData->lineNo);
                $row->setBookingDate($rowData->bookingDate);
                $row->setOperationDate($rowData->operationDate);
                $row->setDescriptionRaw($rowData->descriptionRaw);
                $row->setOperationTypeRaw($rowData->operationType);
                $row->setTitleRaw($rowData->titleRaw);
                $row->setTitleClean($rowData->title);
                $row->setCounterpartyNameRaw($rowData->counterpartyName);
                $row->setOwnAccountLabelRaw($rowData->ownAccountLabelRaw);
                $row->setCounterpartyAccountRaw($rowData->counterpartyAccount);
                $row->setBankCategoryRaw($rowData->bankCategoryRaw);
                $row->setAmountRaw($rowData->amountRaw);
                $row->setAmountMinor($rowData->amountMinor);
                $row->setBalanceAfterMinor($rowData->balanceAfterMinor);
                $row->setParseStatus(
                    $rowData->parseStatus === 'OK'
                        ? CsvImportRow::STATUS_VALIDATED
                        : CsvImportRow::STATUS_PARSE_ERROR
                );
                $row->setParseError($rowData->parseError);

                if ($rowData->parseStatus === 'ERROR') {
                    $rowsInvalid++;
                }

                $this->em->persist($row);
                $batchCount++;

                if ($batchCount >= self::ROW_BATCH_SIZE) {
                    $this->em->flush();
                    $this->em->clear();
                    $batchCount = 0;
                }
            }

            $csvImport = $this->requireImport($importId);
            $csvImport->setRowsTotal($rowsTotal);
            $csvImport->setRowsParsed($rowsTotal - $rowsInvalid);
            $csvImport->setRowsInvalid($rowsInvalid);

            $hasFatal = array_reduce($allErrors, fn($carry, $e) => $carry || $e->fatal, false);

            if (!empty($allErrors)) {
                $csvImport->setErrorSummary(
                    implode("\n", array_map(fn($e) => "[{$e->code}] {$e->message}", $allErrors))
                );
            }

            $csvImport->setStatus(
                $hasFatal ? CsvImport::STATUS_FAILED : CsvImport::STATUS_VALIDATED
            );

            $this->em->flush();

        } catch (\Throwable $ex) {
            $this->logger->error('CsvImport failed with exception', [
                'importId'         => $importId,
                'source'           => $source,
                'originalFilename' => $originalFilename,
                'exceptionClass'   => get_class($ex),
                'message'          => $ex->getMessage(),
                'file'             => $ex->getFile(),
                'line'             => $ex->getLine(),
            ]);

            $this->markImportFailed($importId, $ex);
            $csvImport = $this->em->find(CsvImport::class, $importId) ?? $csvImport;
        }

        return $csvImport;
    }

    private function requireImport(int $importId): CsvImport
    {
        $import = $this->em->find(CsvImport::class, $importId);
        if ($import === null) {
            throw new \RuntimeException("CsvImport {$importId} not found.");
        }

        return $import;
    }

    private function markImportFailed(int $importId, \Throwable $ex): void
    {
        if (!$this->em->isOpen()) {
            $this->em = $this->managerRegistry->resetManager();
        }

        $import = $this->em->find(CsvImport::class, $importId);
        if ($import === null) {
            return;
        }

        $import->setStatus(CsvImport::STATUS_FAILED);
        $import->setErrorSummary('Nieoczekiwany błąd: ' . $ex->getMessage());

        try {
            $this->em->flush();
        } catch (\Throwable $flushEx) {
            $this->logger->error('Failed to persist import failure status', [
                'importId'       => $importId,
                'exceptionClass' => get_class($flushEx),
                'message'        => $flushEx->getMessage(),
            ]);
        }
    }

    private function validateAgainstDatabase(
        ?string   $detectedAccountNumber,
        ?string   $detectedClientName,
        CsvImport $csvImport,
    ): array {
        $errors = [];

        if ($detectedAccountNumber === null || $detectedAccountNumber === '') {
            return $errors;
        }

        $normalizedDetected = preg_replace('/\D+/u', '', $detectedAccountNumber);

        $allAccounts = $this->partyBankAccountRepository->findAll();
        $matched     = null;
        foreach ($allAccounts as $pba) {
            $normalizedDb = preg_replace('/\D+/u', '', (string) $pba->getAccountNumber());
            if ($normalizedDb === $normalizedDetected) {
                $matched = $pba;
                break;
            }
        }

        if ($matched === null) {
            $errors[] = new ImportErrorData(
                scope: 'HEADER',
                code: 'ACCOUNT_NOT_FOUND',
                message: "Rachunek {$detectedAccountNumber} nie istnieje w konfiguracji (party_bank_account).",
                fatal: true,
            );
            return $errors;
        }

        if ($matched->getParty() === null) {
            $errors[] = new ImportErrorData(
                scope: 'HEADER',
                code: 'ACCOUNT_NO_PARTY',
                message: "Rachunek {$detectedAccountNumber} nie jest powiązany z żadnym podmiotem (party).",
                fatal: true,
            );
            return $errors;
        }

        $csvImport->setPartyBankAccount($matched);
        $csvImport->setParty($matched->getParty());

        if ($detectedClientName !== null && $detectedClientName !== '') {
            $dbOwner       = $matched->getOwnerNameFromBank();
            $normalizedDb  = $dbOwner !== null ? $this->normalizeClientName($dbOwner) : null;
            $normalizedCsv = $this->normalizeClientName($detectedClientName);

            if ($normalizedDb === null || $normalizedDb === '') {
                $errors[] = new ImportErrorData(
                    scope: 'HEADER',
                    code: 'OWNER_NAME_NOT_SET',
                    message: "Pole 'Właściciel rachunku' nie jest uzupełnione w konfiguracji — pomijam walidację klienta.",
                    fatal: false,
                );
            } elseif (mb_strtoupper($normalizedCsv) !== mb_strtoupper($normalizedDb)) {
                $errors[] = new ImportErrorData(
                    scope: 'HEADER',
                    code: 'CLIENT_MISMATCH',
                    message: "Klient w pliku CSV ('{$normalizedCsv}') nie zgadza się z właścicielem rachunku ('{$normalizedDb}').",
                    fatal: true,
                );
            }
        }

        return $errors;
    }

    private function normalizeClientName(string $raw): string
    {
        $clean = preg_replace('/[^a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ ]/u', '', $raw);
        $clean = preg_replace('/\s+/', ' ', $clean ?? '');
        return trim($clean ?? '');
    }
}
