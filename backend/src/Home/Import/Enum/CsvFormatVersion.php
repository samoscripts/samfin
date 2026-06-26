<?php

namespace App\Home\Import\Enum;

enum CsvFormatVersion: string
{
    case MbankOperationsList = 'MBANK_OPERATIONS_LIST';
    case MbankElectronicStatement = 'MBANK_ELECTRONIC_STATEMENT';
}
