<?php

namespace App\Home\Report\Settlement\Service;

use App\Home\Report\Settlement\Entity\SettlementConfig;

/**
 * Model A („dopasuj”): suggested[next] ≈ base − carry + saldo portfeli − prepaid_na_start.
 * Prepaid na start z configu; wpłaty w indeksie nie zwiększają prepaid.
 */
class SettlementBalanceEngine
{
    /** @var array<string, int> */
    private array $walletBalancesMinor = [];

    private int $rotationCarryMinor = 0;

    private int $rotationPrepaidMaciekMinor = 0;

    private int $rotationPrepaidBasiaMinor = 0;

    private string $nextDepositor;

    /** @param array<string, string> $walletOwners */
    public function __construct(
        private readonly int $baseDepositMinor,
        private readonly array $walletOwners,
        string $nextDepositor,
        int $rotationCarryMinor = 0,
        int $rotationPrepaidMaciekMinor = 0,
        int $rotationPrepaidBasiaMinor = 0,
        array $openingWalletBalances = [],
    ) {
        $this->nextDepositor = $nextDepositor;
        $this->rotationCarryMinor = $rotationCarryMinor;
        $this->rotationPrepaidMaciekMinor = $rotationPrepaidMaciekMinor;
        $this->rotationPrepaidBasiaMinor = $rotationPrepaidBasiaMinor;

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
        if ($person === $this->nextDepositor) {
            $this->rotationCarryMinor = $this->baseDepositMinor - $amountMinor;
            $this->nextDepositor = self::otherPerson($person);

            return;
        }

        // Wpłata poza kolejką zamyka bieżący slot rotacji (jak wpłata za rotatora).
        // Prepaid nie rośnie w trakcie indeksu — tylko wartości z configu na start reindeksu.
        $this->rotationCarryMinor = $this->baseDepositMinor - $amountMinor;
        $this->nextDepositor = self::otherPerson($this->nextDepositor);
    }

    public function applyFact(array $fact): void
    {
        if ($fact['entryType'] === SettlementItemClassifier::ENTRY_STANDARD_DEPOSIT) {
            $this->applyStandardDeposit($fact['person'], $fact['amountMinor']);
            return;
        }

        $this->applyWalletDelta($fact['walletId'], $fact['walletDeltaMinor']);
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

    public function computeSuggestedRaw(): int
    {
        $person = $this->nextDepositor;
        $prepaid = $person === SettlementConfig::DEPOSITOR_MACIEK
            ? $this->rotationPrepaidMaciekMinor
            : $this->rotationPrepaidBasiaMinor;

        return $this->baseDepositMinor
            - $this->rotationCarryMinor
            + $this->walletBalanceForPerson($person)
            - $prepaid;
    }

    public function computeSuggested(): int
    {
        return max(0, $this->computeSuggestedRaw());
    }

    /** @return array<string, int> */
    public function getWalletBalancesMinor(): array
    {
        return $this->walletBalancesMinor;
    }

    public function getRotationCarryMinor(): int
    {
        return $this->rotationCarryMinor;
    }

    public function getRotationPrepaidMaciekMinor(): int
    {
        return $this->rotationPrepaidMaciekMinor;
    }

    public function getRotationPrepaidBasiaMinor(): int
    {
        return $this->rotationPrepaidBasiaMinor;
    }

    public function getNextDepositor(): string
    {
        return $this->nextDepositor;
    }

    /** @return array<string, mixed> */
    public function toSnapshot(): array
    {
        return [
            'walletBalancesMinor'          => $this->walletBalancesMinor,
            'rotationCarryMinor'           => $this->rotationCarryMinor,
            'rotationPrepaidMaciekMinor'   => $this->rotationPrepaidMaciekMinor,
            'rotationPrepaidBasiaMinor'    => $this->rotationPrepaidBasiaMinor,
            'nextDepositor'                => $this->nextDepositor,
            'suggestedAmountMinor'         => $this->computeSuggested(),
            'suggestedAmountRawMinor'      => $this->computeSuggestedRaw(),
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

        $engine = new self(
            $baseDepositMinor,
            $walletOwners,
            (string) $row['next_depositor'],
            (int) $row['rotation_carry_minor'],
            (int) $row['rotation_prepaid_maciek_minor'],
            (int) $row['rotation_prepaid_basia_minor'],
        );
        $engine->walletBalancesMinor = $normalized;

        return $engine;
    }
}
