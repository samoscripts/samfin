<?php

namespace App\Home\Import\Exception;

use App\Home\Import\Entity\CsvImportRow;
use App\Home\Import\Repository\CsvImportRowRepository;
use App\Home\Transaction\Entity\Transaction;
use App\Home\Transaction\Repository\TransactionRepository;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;

class CsvImportDuplicateRowException extends \InvalidArgumentException
{
    /** @param array<string, mixed> $context */
    private function __construct(
        string $message,
        private readonly array $context,
        ?\Throwable $previous = null,
    ) {
        parent::__construct($message, 0, $previous);
    }

    public static function fromRow(CsvImportRow $row, Transaction $existingTx): self
    {
        $context = self::buildContext($row, $existingTx);
        $message = self::buildMessage($context);

        return new self($message, $context);
    }

    public static function fromUniqueConstraintViolation(
        UniqueConstraintViolationException $previous,
        CsvImportRowRepository $rowRepository,
        TransactionRepository $transactionRepository,
    ): self {
        if (!preg_match("/Duplicate entry '(\d+)' for key 'uniq_transaction_import_row'/", $previous->getMessage(), $matches)) {
            throw $previous;
        }

        $row = $rowRepository->find((int) $matches[1]);
        if ($row === null) {
            throw $previous;
        }

        $existingTx = $transactionRepository->findByImportRow($row);
        if ($existingTx === null) {
            throw $previous;
        }

        $context = self::buildContext($row, $existingTx);

        return new self(self::buildMessage($context), $context, $previous);
    }

    /** @return array<string, mixed> */
    public function getContext(): array
    {
        return $this->context;
    }

    /** @return array<string, mixed> */
    private static function buildContext(CsvImportRow $row, Transaction $existingTx): array
    {
        $amountMinor = $row->getAmountMinor() ?? 0;
        $direction   = $amountMinor >= 0 ? Transaction::DIRECTION_INCOME : Transaction::DIRECTION_EXPENSE;

        return [
            'type' => 'duplicate_import_row',
            'row' => [
                'id'                     => $row->getId(),
                'lineNo'                 => $row->getLineNo(),
                'operationDate'          => $row->getOperationDate()?->format('Y-m-d'),
                'descriptionRaw'         => $row->getDescriptionRaw(),
                'amountMinor'            => $row->getAmountMinor(),
                'amountRaw'              => $row->getAmountRaw(),
                'counterpartyAccountRaw' => $row->getCounterpartyAccountRaw(),
                'parseStatus'            => $row->getParseStatus(),
                'direction'              => $direction,
            ],
            'existingTransaction' => [
                'id'            => $existingTx->getId(),
                'operationDate' => $existingTx->getOperationDate()?->format('Y-m-d'),
                'description'   => $existingTx->getDescription(),
                'amountMinor'   => $existingTx->getAmountMinor(),
                'direction'     => $existingTx->getDirection(),
                'importId'      => $existingTx->getImport()?->getId(),
            ],
        ];
    }

    /** @param array<string, mixed> $context */
    private static function buildMessage(array $context): string
    {
        $row = $context['row'];
        $tx  = $context['existingTransaction'];

        $lines = [
            'Nie można ponownie zaimportować wiersza CSV — transakcja dla tego wiersza już istnieje.',
            '',
            sprintf(
                'Wiersz CSV: %d (id wiersza %s)',
                $row['lineNo'],
                $row['id'] ?? '—',
            ),
            sprintf(
                'Dane wiersza: %s, %s %s, „%s”',
                $row['operationDate'] ?? '—',
                self::directionLabel($row['direction'] ?? ''),
                self::formatAmount($row['amountMinor'] ?? 0),
                $row['descriptionRaw'] ?? '—',
            ),
        ];

        if (!empty($row['counterpartyAccountRaw'])) {
            $lines[] = sprintf('Rachunek kontrahenta: %s', $row['counterpartyAccountRaw']);
        }

        $lines[] = '';
        $lines[] = sprintf(
            'Istniejąca transakcja: #%s%s',
            $tx['id'] ?? '—',
            $tx['importId'] !== null ? sprintf(' (z importu #%s)', $tx['importId']) : '',
        );
        $lines[] = sprintf(
            'Dane transakcji: %s, %s %s, „%s”',
            $tx['operationDate'] ?? '—',
            self::directionLabel($tx['direction'] ?? ''),
            self::formatAmount($tx['amountMinor'] ?? 0),
            $tx['description'] ?? '—',
        );

        return implode("\n", $lines);
    }

    private static function directionLabel(string $direction): string
    {
        return match ($direction) {
            Transaction::DIRECTION_EXPENSE => 'wydatek',
            Transaction::DIRECTION_INCOME  => 'wpływ',
            default                        => $direction !== '' ? $direction : '—',
        };
    }

    private static function formatAmount(int $amountMinor): string
    {
        $sign = $amountMinor < 0 ? '−' : '';
        $abs  = abs($amountMinor);

        return sprintf('%s%s,%02d zł', $sign, intdiv($abs, 100), $abs % 100);
    }
}
