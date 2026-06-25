<?php

namespace App\Home\Report\Settlement\Service;

use App\Home\Configuration\Entity\Party;
use App\Home\Configuration\Entity\Wallet;
use App\Home\Report\Settlement\Entity\SettlementConfig;
use App\Home\Report\Settlement\Repository\SettlementConfigRepository;
use App\Identity\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

class SettlementConfigService
{
    public function __construct(
        private SettlementConfigRepository $repository,
        private EntityManagerInterface $em,
    ) {}

    public function getForUser(User $user): SettlementConfig
    {
        return $this->repository->findOrCreateForUser($user);
    }

    /**
     * @param array<string, mixed> $data
     */
    public function update(User $user, array $data): SettlementConfig
    {
        $config = $this->repository->findOrCreateForUser($user);
        $dirty  = false;

        if (array_key_exists('settlementPartyId', $data)) {
            $config->setSettlementParty($this->resolveParty($data['settlementPartyId']));
            $dirty = true;
        }

        if (array_key_exists('homeBudgetWalletId', $data)) {
            $config->setHomeBudgetWallet($this->resolveWallet($data['homeBudgetWalletId']));
            $dirty = true;
        }

        if (array_key_exists('baseDepositAmount', $data)) {
            $amount = (float) $data['baseDepositAmount'];
            if ($amount <= 0) {
                throw new \InvalidArgumentException('Kwota bazowa musi być większa od zera.');
            }
            $config->setBaseDepositAmountMinor((int) round($amount * 100));
            $dirty = true;
        }

        if (array_key_exists('maciekSourcePartyIds', $data)) {
            $config->setMaciekSourcePartyIds($this->normalizeIdList($data['maciekSourcePartyIds']));
            $dirty = true;
        }

        if (array_key_exists('basiaSourcePartyIds', $data)) {
            $config->setBasiaSourcePartyIds($this->normalizeIdList($data['basiaSourcePartyIds']));
            $dirty = true;
        }

        if (array_key_exists('walletSettlementOwner', $data)) {
            $config->setWalletSettlementOwner($this->normalizeWalletOwner($data['walletSettlementOwner']));
            $dirty = true;
        }

        if (array_key_exists('defaultNextDepositor', $data)) {
            $v = strtolower((string) $data['defaultNextDepositor']);
            if (!in_array($v, [SettlementConfig::DEPOSITOR_MACIEK, SettlementConfig::DEPOSITOR_BASIA], true)) {
                throw new \InvalidArgumentException('defaultNextDepositor: dozwolone maciek lub basia.');
            }
            $config->setDefaultNextDepositor($v);
            $dirty = true;
        }

        if (array_key_exists('carryOverMaciek', $data)) {
            $config->setCarryOverMaciekMinor((int) round((float) $data['carryOverMaciek'] * 100));
            $dirty = true;
        }

        if (array_key_exists('carryOverBasia', $data)) {
            $config->setCarryOverBasiaMinor((int) round((float) $data['carryOverBasia'] * 100));
            $dirty = true;
        }

        if (array_key_exists('reindexFromDate', $data)) {
            $config->setReindexFromDate($this->parseDate($data['reindexFromDate']));
            $dirty = true;
        }

        if (array_key_exists('openingWalletBalances', $data)) {
            $config->setOpeningWalletBalancesJson($this->normalizeOpeningWalletBalances($data['openingWalletBalances']));
            $dirty = true;
        }

        if (array_key_exists('openingRotationCarry', $data)) {
            $config->setOpeningRotationCarryMinor((int) round((float) $data['openingRotationCarry'] * 100));
            $dirty = true;
        }

        if (array_key_exists('openingRotationPrepaidMaciek', $data)) {
            $config->setOpeningRotationPrepaidMaciekMinor((int) round((float) $data['openingRotationPrepaidMaciek'] * 100));
            $dirty = true;
        }

        if (array_key_exists('openingRotationPrepaidBasia', $data)) {
            $config->setOpeningRotationPrepaidBasiaMinor((int) round((float) $data['openingRotationPrepaidBasia'] * 100));
            $dirty = true;
        }

        if (array_key_exists('openingNextDepositor', $data)) {
            $v = strtolower((string) $data['openingNextDepositor']);
            if (!in_array($v, [SettlementConfig::DEPOSITOR_MACIEK, SettlementConfig::DEPOSITOR_BASIA], true)) {
                throw new \InvalidArgumentException('openingNextDepositor: dozwolone maciek lub basia.');
            }
            $config->setOpeningNextDepositor($v);
            $dirty = true;
        }

        if ($dirty) {
            $config->setNeedsRefresh(true);
        }

        $this->em->flush();

        return $config;
    }

    private function resolveParty(mixed $id): ?Party
    {
        if ($id === null || $id === '') {
            return null;
        }
        $party = $this->em->find(Party::class, (int) $id);
        if (!$party) {
            throw new \InvalidArgumentException("Nie znaleziono podmiotu id={$id}.");
        }
        return $party;
    }

    private function resolveWallet(mixed $id): ?Wallet
    {
        if ($id === null || $id === '') {
            return null;
        }
        $wallet = $this->em->find(Wallet::class, (int) $id);
        if (!$wallet) {
            throw new \InvalidArgumentException("Nie znaleziono portfela id={$id}.");
        }
        return $wallet;
    }

    /** @return list<int> */
    private function normalizeIdList(mixed $value): array
    {
        if (!is_array($value)) {
            return [];
        }
        return array_values(array_unique(array_map('intval', $value)));
    }

    /** @return array<string, string> */
    private function normalizeWalletOwner(mixed $value): array
    {
        if (!is_array($value)) {
            return [];
        }
        $result = [];
        foreach ($value as $walletId => $owner) {
            $ownerStr = strtolower((string) $owner);
            if (!in_array($ownerStr, ['maciek', 'basia'], true)) {
                continue;
            }
            $result[(string) $walletId] = $ownerStr;
        }
        return $result;
    }

    /** @return array<string, int> */
    private function normalizeOpeningWalletBalances(mixed $value): array
    {
        if (!is_array($value)) {
            return [];
        }
        $result = [];
        foreach ($value as $walletId => $amount) {
            $result[(string) $walletId] = (int) round((float) $amount * 100);
        }

        return $result;
    }

    private function parseDate(mixed $value): ?\DateTimeImmutable
    {
        if ($value === null || $value === '') {
            return null;
        }

        return new \DateTimeImmutable((string) $value);
    }
}
