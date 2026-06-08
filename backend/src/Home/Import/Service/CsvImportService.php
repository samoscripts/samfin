<?php

namespace App\Home\Import\Service;

use App\Home\Configuration\Repository\PartyBankAccountRepository;
use App\Home\Import\DTO\ImportErrorData;
use App\Home\Import\DTO\ImportRowData;
use App\Home\Import\Entity\CsvImport;
use App\Home\Import\Entity\CsvImportError;
use App\Home\Import\Entity\CsvImportRow;
use App\Home\Import\Provider\BankImportProviderRegistry;
use App\Identity\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;

class CsvImportService
{
    public function __construct(
        private EntityManagerInterface      $em,
        private BankImportProviderRegistry  $providerRegistry,
        private PartyBankAccountRepository  $partyBankAccountRepository,
        private LoggerInterface             $logger,
    ) {}

    public function import(
        string  $source,
        string  $csvContent,
        ?string $originalFilename,
        User    $user,
    ): CsvImport {
        $csvImport = new CsvImport();
        $csvImport->setSource($source);
        $csvImport->setStatus(CsvImport::STATUS_PENDING);
        $csvImport->setOriginalFilename($originalFilename);
        $csvImport->setFileSha256(hash('sha256', $csvContent));
        $csvImport->setCreatedBy($user);
        $csvImport->setUpdatedBy($user);

        $this->em->persist($csvImport);
        $this->em->flush();

        try {
            $provider = $this->providerRegistry->get($source);
            $result   = $provider->parse($csvContent);

            $csvImport->setDetectedClientName($result->detectedClientName);
            $csvImport->setDetectedAccountNumber($result->detectedAccountNumber);
            $csvImport->setDetectedAccountDisplay($result->detectedAccountDisplay);
            $csvImport->setPeriodFrom($result->periodFrom);
            $csvImport->setPeriodTo($result->periodTo);

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

            $rowsTotal   = count($result->rows);
            $rowsInvalid = 0;

            foreach ($result->rows as $rowData) {
                /** @var ImportRowData $rowData */
                $row = new CsvImportRow();
                $row->setCsvImport($csvImport);
                $row->setLineNo($rowData->lineNo);
                $row->setOperationDate($rowData->operationDate);
                $row->setDescriptionRaw($rowData->descriptionRaw);
                $row->setAccountRaw($rowData->accountRaw);
                $row->setBankCategoryRaw($rowData->bankCategoryRaw);
                $row->setAmountRaw($rowData->amountRaw);
                $row->setAmountMinor($rowData->amountMinor);
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
            }

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
                'importId'         => $csvImport->getId(),
                'source'           => $source,
                'originalFilename' => $originalFilename,
                'exceptionClass'   => get_class($ex),
                'message'          => $ex->getMessage(),
                'file'             => $ex->getFile(),
                'line'             => $ex->getLine(),
            ]);

            $csvImport->setStatus(CsvImport::STATUS_FAILED);
            $csvImport->setErrorSummary('Nieoczekiwany błąd: ' . $ex->getMessage());
            $this->em->flush();
        }

        return $csvImport;
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

        $normalizedDetected = preg_replace('/\D/', '', $detectedAccountNumber);

        $allAccounts = $this->partyBankAccountRepository->findAll();
        $matched     = null;
        foreach ($allAccounts as $pba) {
            $normalizedDb = preg_replace('/\D/', '', (string)$pba->getAccountNumber());
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
