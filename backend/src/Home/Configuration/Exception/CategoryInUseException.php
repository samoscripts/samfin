<?php

namespace App\Home\Configuration\Exception;

class CategoryInUseException extends \InvalidArgumentException
{
    /**
     * @param array{items: int, templates: int, rules: int, total: int} $usage
     */
    public function __construct(private readonly array $usage)
    {
        parent::__construct('Nie można dezaktywować kategorii, ponieważ jest używana.');
    }

    /**
     * @return array{items: int, templates: int, rules: int, total: int}
     */
    public function getUsage(): array
    {
        return $this->usage;
    }
}
