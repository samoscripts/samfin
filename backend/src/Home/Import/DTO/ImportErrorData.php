<?php

namespace App\Home\Import\DTO;

final class ImportErrorData
{
    public function __construct(
        public readonly string  $scope,
        public readonly string  $code,
        public readonly string  $message,
        public readonly ?int    $lineNo = null,
        public readonly bool    $fatal  = true,
    ) {}
}
