<?php

namespace App\Home\Configuration\Exception;

class CategoryInUseException extends \InvalidArgumentException
{
    /**
     * @param array{items: int, templates: int, rules: int, total: int} $usage
     */
    public function __construct(
        private readonly array $usage,
        string $message = 'Nie można dezaktywować kategorii, ponieważ jest używana.',
    ) {
        parent::__construct($message);
    }

    /**
     * @return array{items: int, templates: int, rules: int, total: int}
     */
    public function getUsage(): array
    {
        return $this->usage;
    }
}
