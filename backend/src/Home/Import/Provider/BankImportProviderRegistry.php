<?php

namespace App\Home\Import\Provider;

use Symfony\Component\DependencyInjection\Attribute\TaggedIterator;

class BankImportProviderRegistry
{
    /** @var array<string, BankImportProviderInterface> */
    private array $providers = [];

    public function __construct(
        #[TaggedIterator('app.bank_import_provider')]
        iterable $providers,
    ) {
        foreach ($providers as $provider) {
            $this->providers[$provider->getCode()] = $provider;
        }
    }

    public function get(string $code): BankImportProviderInterface
    {
        if (!isset($this->providers[$code])) {
            throw new \InvalidArgumentException("Unknown bank import provider: {$code}");
        }
        return $this->providers[$code];
    }

    public function has(string $code): bool
    {
        return isset($this->providers[$code]);
    }

    /** @return array<array{code: string, displayName: string}> */
    public function listAll(): array
    {
        $result = [];
        foreach ($this->providers as $provider) {
            $result[] = [
                'code'        => $provider->getCode(),
                'displayName' => $provider->getDisplayName(),
            ];
        }
        return $result;
    }
}
