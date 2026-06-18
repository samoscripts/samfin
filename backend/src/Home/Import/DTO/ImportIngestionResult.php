<?php

namespace App\Home\Import\DTO;

final class ImportIngestionResult
{
    public function __construct(
        public readonly int $imported,
        public readonly int $skipped,
        public readonly int $duplicates,
    ) {}

    /** @return array{imported: int, skipped: int, duplicates: int} */
    public function toApiArray(): array
    {
        return [
            'imported'   => $this->imported,
            'skipped'    => $this->skipped,
            'duplicates' => $this->duplicates,
        ];
    }
}
