<?php

namespace App\Home\Import\Provider;

use App\Home\Import\DTO\ImportResult;

interface BankImportProviderInterface
{
    /** Unique machine code used in csv_import.source, e.g. 'MBANK' */
    public function getCode(): string;

    /** Human-readable name shown in UI, e.g. 'mBank S.A.' */
    public function getDisplayName(): string;

    /**
     * Parse and validate the uploaded CSV content.
     *
     * @param string $csvContent  Raw UTF-8 content of the uploaded file
     */
    public function parse(string $csvContent): ImportResult;
}
