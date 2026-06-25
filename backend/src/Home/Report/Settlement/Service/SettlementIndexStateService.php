<?php

namespace App\Home\Report\Settlement\Service;

use App\Home\Report\Settlement\Entity\SettlementConfig;
use App\Home\Report\Settlement\Repository\SettlementConfigRepository;
use App\Identity\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

class SettlementIndexStateService
{
    public function __construct(
        private SettlementConfigRepository $configRepository,
        private EntityManagerInterface $em,
    ) {}

    public function markDirty(User $user): void
    {
        $config = $this->configRepository->findOneBy(['user' => $user]);
        if ($config === null) {
            return;
        }

        $config->setNeedsRefresh(true);
        $this->em->flush();
    }

    public function computeConfigVersion(SettlementConfig $config): string
    {
        $payload = [
            'settlementPartyId'     => $config->getSettlementParty()?->getId(),
            'homeBudgetWalletId'    => $config->getHomeBudgetWallet()?->getId(),
            'baseDepositAmountMinor'=> $config->getBaseDepositAmountMinor(),
            'maciekSourcePartyIds'  => $config->getMaciekSourcePartyIds(),
            'basiaSourcePartyIds'   => $config->getBasiaSourcePartyIds(),
            'walletSettlementOwner' => $config->getWalletSettlementOwner(),
            'defaultNextDepositor'  => $config->getDefaultNextDepositor(),
            'openingWalletBalances' => $config->getOpeningWalletBalancesJson(),
            'openingRotationCarry'  => $config->getOpeningRotationCarryMinor(),
            'openingPrepaidMaciek'  => $config->getOpeningRotationPrepaidMaciekMinor(),
            'openingPrepaidBasia'   => $config->getOpeningRotationPrepaidBasiaMinor(),
            'openingNextDepositor'  => $config->getOpeningNextDepositor(),
            'reindexFromDate'       => $config->getReindexFromDate()?->format('Y-m-d'),
        ];

        return hash('sha256', json_encode($payload, JSON_THROW_ON_ERROR));
    }
}
