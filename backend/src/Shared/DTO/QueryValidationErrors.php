<?php

namespace App\Shared\DTO;

final readonly class QueryValidationErrors
{
    /** @param array<string, string> $fields */
    public function __construct(public array $fields) {}

    /** @return array{message: string, errors: array<string, string>} */
    public function toArray(): array
    {
        return [
            'message' => 'Nieprawidłowe parametry zapytania.',
            'errors'  => $this->fields,
        ];
    }
}
