<?php

namespace App\Home\Report\Settlement\Service;

use App\Home\Configuration\Entity\Wallet;
use App\Home\Report\Settlement\Entity\SettlementConfig;
use App\Home\Report\Settlement\Entity\SettlementLedgerEntry;
use App\Home\Report\Settlement\Repository\SettlementItemQuery;
use App\Home\Report\Settlement\Repository\SettlementLedgerRepository;
use App\Home\Transaction\Entity\TransactionItem;
use App\Identity\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

class SettlementIndexerService
{
    public function __construct(
        private EntityManagerInterface $em,
        private SettlementItemQuery $itemQuery,
        private SettlementLedgerRepository $ledgerRepository,
        private SettlementItemClassifier $classifier,
        private SettlementIndexStateService $indexStateService,
    ) {}

    /**
     * @return array{factsIndexed: int, skippedCount: int, refreshedAt: string}
     */
    public function rebuild(SettlementConfig $config): array
    {
        if (!$config->isConfigured()) {
            throw new \InvalidArgumentException('Raport wymaga skonfigurowania podmiotu rozliczenia i portfela budżetu domowego.');
        }

        if ($config->isRefreshInProgress()) {
            throw new \RuntimeException('Odświeżanie rozliczeń jest już w toku.');
        }

        $user = $config->getUser();
        if ($user === null) {
            throw new \RuntimeException('Brak użytkownika w konfiguracji rozliczenia.');
        }

        $reindexFrom = $config->getReindexFromDate()
            ?? new \DateTimeImmutable('2000-01-01');

        $config->setRefreshInProgress(true);
        $this->em->flush();

        $connection = $this->em->getConnection();
        $connection->beginTransaction();

        try {
            $this->ledgerRepository->deleteAllForUser($user);

            $engine = $this->buildInitialEngine($config);

            $settlementPartyId = $config->getSettlementParty()->getId();
            $homeBudgetId      = $config->getHomeBudgetWallet()->getId();
            $maciekSources     = $config->getMaciekSourcePartyIds();
            $basiaSources      = $config->getBasiaSourcePartyIds();
            $walletOwners      = $config->getWalletSettlementOwner();
            $configVersion     = $this->indexStateService->computeConfigVersion($config);

            $items = $this->itemQuery->fetchItemsFromDate(
                $reindexFrom->format('Y-m-d'),
                $settlementPartyId,
                false,
                $homeBudgetId,
                $maciekSources,
                $basiaSources,
            );

            $sequence  = 1;
            $indexed   = 0;
            $skipped   = 0;
            $now       = new \DateTimeImmutable();

            foreach ($items as $item) {
                $fact = $this->classifier->classifyFact(
                    $item,
                    $settlementPartyId,
                    $homeBudgetId,
                    $maciekSources,
                    $basiaSources,
                    $walletOwners,
                );

                if ($fact === null) {
                    $skipped++;
                    continue;
                }

                $engine->applyFact($fact);
                $snapshot = $engine->toSnapshot();

                $entry = new SettlementLedgerEntry();
                $entry->setUser($user);
                $entry->setTransactionItem($this->em->getReference(TransactionItem::class, $item['itemId']));
                $entry->setOperationDate(new \DateTimeImmutable($item['operationDate']));
                $entry->setLedgerSequence($sequence++);
                $entry->setEntryType($fact['entryType']);
                $entry->setPerson($fact['person']);
                if ($fact['walletId'] > 0) {
                    $entry->setWallet($this->em->getReference(Wallet::class, $fact['walletId']));
                }
                $entry->setAmountMinor($fact['amountMinor']);
                $entry->setWalletDeltaMinor($fact['walletDeltaMinor']);
                $entry->setWalletBalancesJson($snapshot['walletBalancesMinor']);
                $entry->setMaciekDepositsTotalMinor($snapshot['maciekDepositsTotalMinor']);
                $entry->setBasiaDepositsTotalMinor($snapshot['basiaDepositsTotalMinor']);
                $entry->setRotationCarryMinor(0);
                $entry->setRotationPrepaidMaciekMinor($snapshot['rotationPrepaidMaciekMinor']);
                $entry->setRotationPrepaidBasiaMinor($snapshot['rotationPrepaidBasiaMinor']);
                $entry->setAnchor($snapshot['anchor']);
                $entry->setSuggestedAmountMinor($snapshot['suggestedAmountMinor']);
                $entry->setConfigVersion($configVersion);
                $entry->setCreatedAt($now);

                $this->em->persist($entry);
                $indexed++;
            }

            $config->setNeedsRefresh(false);
            $config->setRefreshInProgress(false);
            $config->setLastRefreshedAt($now);
            $config->setConfigVersion($configVersion);
            $config->setLastRefreshStatsJson([
                'factsIndexed' => $indexed,
                'skippedCount' => $skipped,
                'refreshedAt'  => $now->format(\DateTimeInterface::ATOM),
            ]);

            if ($config->getReindexFromDate() === null) {
                $config->setReindexFromDate($reindexFrom);
            }

            $this->em->flush();
            $connection->commit();

            return [
                'factsIndexed' => $indexed,
                'skippedCount' => $skipped,
                'refreshedAt'  => $now->format(\DateTimeInterface::ATOM),
            ];
        } catch (\Throwable $e) {
            $connection->rollBack();
            $config->setRefreshInProgress(false);
            $config->setNeedsRefresh(true);
            $this->em->flush();
            throw $e;
        }
    }

    private function buildInitialEngine(SettlementConfig $config): SettlementRotationEngine
    {
        $openingBalances = $config->getOpeningWalletBalancesJson();

        return new SettlementRotationEngine(
            $config->getBaseDepositAmountMinor(),
            $config->getWalletSettlementOwner(),
            $config->getOpeningNextDepositor(),
            $config->getOpeningRotationPrepaidMaciekMinor(),
            $config->getOpeningRotationPrepaidBasiaMinor(),
            $openingBalances ?? [],
        );
    }
}
