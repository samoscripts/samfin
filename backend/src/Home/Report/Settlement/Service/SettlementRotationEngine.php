<?php

namespace App\Home\Report\Settlement\Service;

use App\Home\Report\Settlement\Entity\SettlementConfig;

/**
 * Model B (stan + anchor): sugerowana wpłata kotwicy = dorównanie Σ wpłat + saldo portfela − prepaid.
 */
class SettlementRotationEngine
{
    /** @var array<string, int> */
    private array $walletBalancesMinor = [];

    private int $maciekDepositsTotalMinor = 0;

    private int $basiaDepositsTotalMinor = 0;

    private string $anchor;

    private string $previousAnchor;

    public function __construct(
        private readonly int $baseDepositMinor,
        private readonly array $walletOwners,
        string $bootstrapAnchor,
        private int $rotationPrepaidMaciekMinor = 0,
        private int $rotationPrepaidBasiaMinor = 0,
        array $openingWalletBalances = [],
    ) {
        $this->anchor = $bootstrapAnchor;
        $this->previousAnchor = $bootstrapAnchor;

        foreach ($openingWalletBalances as $walletId => $balance) {
            $this->walletBalancesMinor[(string) $walletId] = (int) $balance;
        }
    }

    public static function otherPerson(string $person): string
    {
        return $person === SettlementConfig::DEPOSITOR_MACIEK
            ? SettlementConfig::DEPOSITOR_BASIA
            : SettlementConfig::DEPOSITOR_MACIEK;
    }

    public function applyWalletDelta(int $walletId, int $deltaMinor): void
    {
        $key = (string) $walletId;
        $this->walletBalancesMinor[$key] = ($this->walletBalancesMinor[$key] ?? 0) + $deltaMinor;
    }

    public function applyStandardDeposit(string $person, int $amountMinor): void
    {
        if ($person === SettlementConfig::DEPOSITOR_MACIEK) {
            $this->maciekDepositsTotalMinor += $amountMinor;
        } else {
            $this->basiaDepositsTotalMinor += $amountMinor;
        }

        $this->resolveAnchor();
    }

    public function applyFact(array $fact): void
    {
        if (
            $fact['entryType'] === SettlementItemClassifier::ENTRY_STANDARD_DEPOSIT
            || $fact['entryType'] === SettlementItemClassifier::ENTRY_SOURCE_EXP_DEPOSIT
        ) {
            $this->applyStandardDeposit($fact['person'], $fact['amountMinor']);

            return;
        }

        $this->applyWalletDelta($fact['walletId'], $fact['walletDeltaMinor']);
    }

    public function resolveAnchor(): void
    {
        $stanMaciek = $this->stanForPerson(SettlementConfig::DEPOSITOR_MACIEK);

        if ($stanMaciek < 0) {
            $this->previousAnchor = $this->anchor;
            $this->anchor = SettlementConfig::DEPOSITOR_MACIEK;

            return;
        }

        if ($stanMaciek > 0) {
            $this->previousAnchor = $this->anchor;
            $this->anchor = SettlementConfig::DEPOSITOR_BASIA;

            return;
        }

        $this->previousAnchor = $this->anchor;
        $this->anchor = self::otherPerson($this->previousAnchor);
    }

    public function stanForPerson(string $person): int
    {
        if ($person === SettlementConfig::DEPOSITOR_MACIEK) {
            return $this->maciekDepositsTotalMinor - $this->basiaDepositsTotalMinor;
        }

        return $this->basiaDepositsTotalMinor - $this->maciekDepositsTotalMinor;
    }

    public function computeCatchUpMinor(string $person): int
    {
        if ($person !== $this->anchor) {
            return 0;
        }

        $stan = $this->stanForPerson($person);

        if ($stan < 0) {
            return $this->depositsTotalForPerson(self::otherPerson($person))
                - $this->depositsTotalForPerson($person);
        }

        return $this->baseDepositMinor;
    }

    public function computeSuggestedRawForPerson(string $person): int
    {
        return $this->computeCatchUpMinor($person)
            + $this->walletBalanceForPerson($person)
            - $this->prepaidForPerson($person);
    }

    public function computeSuggestedForPerson(string $person): int
    {
        return max(0, $this->computeSuggestedRawForPerson($person));
    }

    public function computeAnchorSuggested(): int
    {
        return $this->computeSuggestedForPerson($this->anchor);
    }

    public function walletBalanceForPerson(string $person): int
    {
        $sum = 0;
        foreach ($this->walletBalancesMinor as $walletId => $balance) {
            if (($this->walletOwners[$walletId] ?? null) === $person) {
                $sum += $balance;
            }
        }

        return $sum;
    }

    private function depositsTotalForPerson(string $person): int
    {
        return $person === SettlementConfig::DEPOSITOR_MACIEK
            ? $this->maciekDepositsTotalMinor
            : $this->basiaDepositsTotalMinor;
    }

    private function prepaidForPerson(string $person): int
    {
        return $person === SettlementConfig::DEPOSITOR_MACIEK
            ? $this->rotationPrepaidMaciekMinor
            : $this->rotationPrepaidBasiaMinor;
    }

    /** @return array<string, int> */
    public function getWalletBalancesMinor(): array
    {
        return $this->walletBalancesMinor;
    }

    public function getMaciekDepositsTotalMinor(): int
    {
        return $this->maciekDepositsTotalMinor;
    }

    public function getBasiaDepositsTotalMinor(): int
    {
        return $this->basiaDepositsTotalMinor;
    }

    public function getAnchor(): string
    {
        return $this->anchor;
    }

    public function getRotationPrepaidMaciekMinor(): int
    {
        return $this->rotationPrepaidMaciekMinor;
    }

    public function getRotationPrepaidBasiaMinor(): int
    {
        return $this->rotationPrepaidBasiaMinor;
    }

    /** @return array<string, mixed> */
    public function toSnapshot(): array
    {
        return [
            'walletBalancesMinor'         => $this->walletBalancesMinor,
            'maciekDepositsTotalMinor'    => $this->maciekDepositsTotalMinor,
            'basiaDepositsTotalMinor'     => $this->basiaDepositsTotalMinor,
            'anchor'                      => $this->anchor,
            'rotationCarryMinor'          => 0,
            'rotationPrepaidMaciekMinor'  => $this->rotationPrepaidMaciekMinor,
            'rotationPrepaidBasiaMinor'   => $this->rotationPrepaidBasiaMinor,
            'suggestedAmountMinor'        => $this->computeAnchorSuggested(),
        ];
    }

    /**
     * @param array<string, mixed> $row
     * @param array<string, string> $walletOwners
     */
    public static function fromLedgerRow(array $row, int $baseDepositMinor, array $walletOwners): self
    {
        $balances = $row['wallet_balances_json'];
        if (is_string($balances)) {
            $balances = json_decode($balances, true, 512, JSON_THROW_ON_ERROR);
        }

        $normalized = [];
        foreach ($balances as $walletId => $balance) {
            $normalized[(string) $walletId] = (int) $balance;
        }

        $anchor = (string) ($row['anchor'] ?? $row['next_depositor'] ?? SettlementConfig::DEPOSITOR_MACIEK);

        $engine = new self(
            $baseDepositMinor,
            $walletOwners,
            $anchor,
            (int) $row['rotation_prepaid_maciek_minor'],
            (int) $row['rotation_prepaid_basia_minor'],
        );
        $engine->walletBalancesMinor = $normalized;
        $engine->maciekDepositsTotalMinor = (int) ($row['maciek_deposits_total_minor'] ?? 0);
        $engine->basiaDepositsTotalMinor = (int) ($row['basia_deposits_total_minor'] ?? 0);
        $engine->anchor = $anchor;
        $engine->previousAnchor = $anchor;

        return $engine;
    }

    /**
     * @param array<string, mixed> $snapshot from {@see toSnapshot()}
     * @param array<string, string> $walletOwners
     */
    public static function fromSnapshot(array $snapshot, int $baseDepositMinor, array $walletOwners): self
    {
        $balances = $snapshot['walletBalancesMinor'] ?? [];
        $normalized = [];
        foreach ($balances as $walletId => $balance) {
            $normalized[(string) $walletId] = (int) $balance;
        }

        $anchor = (string) ($snapshot['anchor'] ?? SettlementConfig::DEPOSITOR_MACIEK);

        $engine = new self(
            $baseDepositMinor,
            $walletOwners,
            $anchor,
            (int) ($snapshot['rotationPrepaidMaciekMinor'] ?? 0),
            (int) ($snapshot['rotationPrepaidBasiaMinor'] ?? 0),
            $normalized,
        );
        $engine->maciekDepositsTotalMinor = (int) ($snapshot['maciekDepositsTotalMinor'] ?? 0);
        $engine->basiaDepositsTotalMinor = (int) ($snapshot['basiaDepositsTotalMinor'] ?? 0);
        $engine->anchor = $anchor;
        $engine->previousAnchor = $anchor;

        return $engine;
    }
}
