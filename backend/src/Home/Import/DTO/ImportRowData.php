<?php

namespace App\Home\Import\DTO;

final class ImportRowData
{
    public function __construct(
        public readonly int    $lineNo,
        public readonly ?\DateTimeImmutable $operationDate,
        public readonly ?string $descriptionRaw,
        public readonly ?string $ownAccountLabelRaw,
        public readonly ?string $counterpartyAccountRaw,
        public readonly ?string $bankCategoryRaw,
        public readonly ?string $amountRaw,
        public readonly ?int    $amountMinor,
        public readonly string $parseStatus,
        public readonly ?string $parseError,
    ) {}
}
