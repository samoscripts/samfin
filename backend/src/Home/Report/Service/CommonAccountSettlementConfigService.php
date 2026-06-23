<?php

namespace App\Home\Report\Service;

use App\Home\Configuration\Entity\Party;
use App\Home\Configuration\Entity\Wallet;
use App\Home\Report\Entity\CommonAccountSettlementConfig;
use App\Home\Report\Repository\CommonAccountSettlementConfigRepository;
use App\Identity\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

class CommonAccountSettlementConfigService
{
    public function __construct(
        private CommonAccountSettlementConfigRepository $repository,
        private EntityManagerInterface $em,
    ) {}

    public function getForUser(User $user): CommonAccountSettlementConfig
    {
        return $this->repository->findOrCreateForUser($user);
    }

    /**
     * @param array<string, mixed> $data
     */
    public function update(User $user, array $data): CommonAccountSettlementConfig
    {
        $config = $this->repository->findOrCreateForUser($user);

        if (array_key_exists('commonAccountPartyId', $data)) {
            $config->setCommonAccountParty($this->resolveParty($data['commonAccountPartyId']));
        }

        if (array_key_exists('homeBudgetWalletId', $data)) {
            $config->setHomeBudgetWallet($this->resolveWallet($data['homeBudgetWalletId']));
        }

        if (array_key_exists('baseDepositAmount', $data)) {
            $amount = (float) $data['baseDepositAmount'];
            if ($amount <= 0) {
                throw new \InvalidArgumentException('Kwota bazowa musi być większa od zera.');
            }
            $config->setBaseDepositAmountMinor((int) round($amount * 100));
        }

        if (array_key_exists('maciekSourcePartyIds', $data)) {
            $config->setMaciekSourcePartyIds($this->normalizeIdList($data['maciekSourcePartyIds']));
        }

        if (array_key_exists('basiaSourcePartyIds', $data)) {
            $config->setBasiaSourcePartyIds($this->normalizeIdList($data['basiaSourcePartyIds']));
        }

        if (array_key_exists('walletSettlementOwner', $data)) {
            $config->setWalletSettlementOwner($this->normalizeWalletOwner($data['walletSettlementOwner']));
        }

        if (array_key_exists('defaultNextDepositor', $data)) {
            $v = strtolower((string) $data['defaultNextDepositor']);
            if (!in_array($v, [CommonAccountSettlementConfig::DEPOSITOR_MACIEK, CommonAccountSettlementConfig::DEPOSITOR_BASIA], true)) {
                throw new \InvalidArgumentException('defaultNextDepositor: dozwolone maciek lub basia.');
            }
            $config->setDefaultNextDepositor($v);
        }

        if (array_key_exists('carryOverMaciek', $data)) {
            $config->setCarryOverMaciekMinor((int) round((float) $data['carryOverMaciek'] * 100));
        }

        if (array_key_exists('carryOverBasia', $data)) {
            $config->setCarryOverBasiaMinor((int) round((float) $data['carryOverBasia'] * 100));
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
}
