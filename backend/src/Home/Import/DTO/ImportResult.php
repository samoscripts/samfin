<?php

namespace App\Home\Import\DTO;

final class ImportResult
{
    /** @param ImportRowData[]   $rows */
    /** @param ImportErrorData[] $errors */
    public function __construct(
        public readonly bool   $headerValid,
        public readonly ?string $detectedClientName,
        public readonly ?string $detectedAccountNumber,
        public readonly ?string $detectedAccountDisplay,
        public readonly ?\DateTimeImmutable $periodFrom,
        public readonly ?\DateTimeImmutable $periodTo,
        public readonly array  $rows,
        public readonly array  $errors,
    ) {}

    public function hasErrors(): bool
    {
        return !empty($this->errors);
    }

    public function hasFatalErrors(): bool
    {
        foreach ($this->errors as $e) {
            /** @var ImportErrorData $e */
            if ($e->fatal) {
                return true;
            }
        }
        return false;
    }
}
