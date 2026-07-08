<?php

namespace App\Home\Report\Shared\DTO;

final readonly class ReportPeriodResult
{
    public function __construct(
        public ?string $dateFrom,
        public ?string $dateTo,
    ) {}
}
