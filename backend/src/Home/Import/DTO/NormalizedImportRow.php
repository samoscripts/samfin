<?php

namespace App\Home\Import\DTO;

use App\Home\Import\Enum\CsvFormatVersion;

final class NormalizedImportRow
{
    public function __construct(
        public readonly CsvFormatVersion $csvFormat,
        public readonly int $lineNo,
        public readonly ?\DateTimeImmutable $bookingDate,
        public readonly ?\DateTimeImmutable $operationDate,
        public readonly ?string $descriptionRaw,
        public readonly ?string $operationType,
        public readonly ?string $titleRaw,
        public readonly ?string $title,
        public readonly ?string $counterpartyName,
        public readonly ?string $ownAccountLabelRaw,
        public readonly ?string $counterpartyAccount,
        public readonly ?string $bankCategoryRaw,
        public readonly ?string $amountRaw,
        public readonly ?int $amountMinor,
        public readonly ?int $balanceAfterMinor,
        public readonly string $parseStatus,
        public readonly ?string $parseError,
    ) {}
}
