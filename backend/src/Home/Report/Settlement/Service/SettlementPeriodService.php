<?php

namespace App\Home\Report\Settlement\Service;

use App\Home\Report\Settlement\Entity\SettlementConfig;
use App\Home\Report\Settlement\Entity\SettlementPeriod;
use App\Home\Report\Settlement\Repository\SettlementItemQuery;
use App\Home\Report\Settlement\Repository\SettlementLedgerRepository;
use App\Home\Report\Settlement\Repository\SettlementPeriodRepository;
use App\Identity\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

class SettlementPeriodService
{
    public function __construct(
        private EntityManagerInterface $em,
        private SettlementPeriodRepository $periodRepository,
        private SettlementItemQuery $itemQuery,
        private SettlementLedgerRepository $ledgerRepository,
        private SettlementItemClassifier $classifier,
    ) {}

    public function ensurePeriodsReady(User $user, SettlementConfig $config): void
    {
        if (!$config->isConfigured() || $config->getReindexFromDate() === null) {
            return;
        }

        $firstYear = (int) $config->getReindexFromDate()->format('Y');
        $currentYear = (int) (new \DateTimeImmutable('today'))->format('Y');

        for ($year = $firstYear; $year <= $currentYear; $year++) {
            $this->ensurePeriodExists($user, $year);
        }

        $this->autoCloseExpiredPeriods($user, $config);
    }

    /**
     * @return array{periods: list<array<string, mixed>>, currentYear: int, firstYear: int}
     */
    public function listPeriods(User $user, SettlementConfig $config): array
    {
        $this->ensurePeriodsReady($user, $config);

        $periods = $this->periodRepository->findAllForUserOrdered($user);
        $currentYear = (int) (new \DateTimeImmutable('today'))->format('Y');
        $firstYear = $config->getReindexFromDate() !== null
            ? (int) $config->getReindexFromDate()->format('Y')
            : $currentYear;

        return [
            'periods'     => array_map(static fn (SettlementPeriod $p) => $p->toApiArray(), $periods),
            'currentYear' => $currentYear,
            'firstYear'   => $firstYear,
        ];
    }

    public function resolvePeriod(User $user, SettlementConfig $config, int $year): SettlementPeriod
    {
        $this->ensurePeriodsReady($user, $config);

        $period = $this->periodRepository->findByUserAndYear($user, $year);
        if ($period === null) {
            throw new \InvalidArgumentException(sprintf('Okres rozliczeniowy %d nie istnieje.', $year));
        }

        return $period;
    }

    /**
     * @return array{dateFrom: string, dateTo: string, effectiveFrom: string, effectiveTo: string}
     */
    public function resolveDateBounds(SettlementPeriod $period, SettlementConfig $config): array
    {
        $periodFrom = $period->getDateFrom()->format('Y-m-d');
        $periodTo   = $period->getDateTo()->format('Y-m-d');
        $today      = (new \DateTimeImmutable('today'))->format('Y-m-d');
        $reindexFrom = $config->getReindexFromDate()?->format('Y-m-d') ?? $periodFrom;

        $effectiveFrom = $periodFrom > $reindexFrom ? $periodFrom : $reindexFrom;
        $effectiveTo   = $periodTo < $today ? $periodTo : $today;

        if ($effectiveFrom > $effectiveTo) {
            $effectiveTo = $effectiveFrom;
        }

        return [
            'dateFrom'      => $periodFrom,
            'dateTo'        => $periodTo,
            'effectiveFrom' => $effectiveFrom,
            'effectiveTo'   => $effectiveTo,
        ];
    }

    public function assertRefreshAllowed(User $user, SettlementConfig $config): void
    {
        $this->ensurePeriodsReady($user, $config);
        $currentYear = (int) (new \DateTimeImmutable('today'))->format('Y');
        $period = $this->periodRepository->findByUserAndYear($user, $currentYear);

        if ($period !== null && $period->isClosed()) {
            throw new \InvalidArgumentException('Nie można odświeżyć zamkniętego okresu rozliczeniowego.');
        }
    }

    private function ensurePeriodExists(User $user, int $year): SettlementPeriod
    {
        $existing = $this->periodRepository->findByUserAndYear($user, $year);
        if ($existing !== null) {
            return $existing;
        }

        $period = SettlementPeriod::forYear($user, $year);
        $this->em->persist($period);
        $this->em->flush();

        return $period;
    }

    private function autoCloseExpiredPeriods(User $user, SettlementConfig $config): void
    {
        $today = new \DateTimeImmutable('today');
        $openEnded = $this->periodRepository->findOpenPeriodsEndedBefore($user, $today);

        foreach ($openEnded as $period) {
            $this->closePeriod($user, $config, $period);
        }
    }

    private function closePeriod(User $user, SettlementConfig $config, SettlementPeriod $period): void
    {
        if ($period->isClosed()) {
            return;
        }

        $snapshot = $this->buildClosingSnapshot($config, $period);
        $now = new \DateTimeImmutable();

        $period->setClosingSnapshotJson($snapshot);
        $period->setStatus(SettlementPeriod::STATUS_CLOSED);
        $period->setClosedAt($now);

        $nextYear = $period->getYear() + 1;
        $currentYear = (int) (new \DateTimeImmutable('today'))->format('Y');

        if ($nextYear <= $currentYear) {
            $this->applySnapshotToConfigOpening($config, $snapshot, $nextYear);
            $this->ensurePeriodExists($user, $nextYear);
        }

        $this->em->flush();
    }

    /** @return array<string, mixed> */
    private function buildClosingSnapshot(SettlementConfig $config, SettlementPeriod $period): array
    {
        $dateTo = $period->getDateTo()->format('Y-m-d');
        $engine = $this->replayEngineToDate($config, $dateTo);

        return $engine->toSnapshot();
    }

    /** @param array<string, mixed> $snapshot */
    private function applySnapshotToConfigOpening(
        SettlementConfig $config,
        array $snapshot,
        int $nextYear,
    ): void {
        $balances = $snapshot['walletBalancesMinor'] ?? [];
        $normalized = [];
        foreach ($balances as $walletId => $balance) {
            $normalized[(string) $walletId] = (int) $balance;
        }

        $config->setOpeningWalletBalancesJson($normalized);
        $config->setOpeningRotationPrepaidMaciekMinor((int) ($snapshot['rotationPrepaidMaciekMinor'] ?? 0));
        $config->setOpeningRotationPrepaidBasiaMinor((int) ($snapshot['rotationPrepaidBasiaMinor'] ?? 0));
        $config->setOpeningNextDepositor((string) ($snapshot['anchor'] ?? SettlementConfig::DEPOSITOR_MACIEK));
        $config->setReindexFromDate(new \DateTimeImmutable(sprintf('%04d-01-01', $nextYear)));
        $config->setNeedsRefresh(true);
    }

    private function replayEngineToDate(SettlementConfig $config, string $dateTo): SettlementRotationEngine
    {
        $settlementPartyId = $config->getSettlementParty()->getId();
        $homeBudgetId      = $config->getHomeBudgetWallet()->getId();
        $maciekSources     = $config->getMaciekSourcePartyIds();
        $basiaSources      = $config->getBasiaSourcePartyIds();
        $walletOwners      = $config->getWalletSettlementOwner();
        $reindexFrom       = $config->getReindexFromDate()?->format('Y-m-d') ?? '2000-01-01';

        $engine = new SettlementRotationEngine(
            $config->getBaseDepositAmountMinor(),
            $walletOwners,
            $config->getOpeningNextDepositor(),
            $config->getOpeningRotationPrepaidMaciekMinor(),
            $config->getOpeningRotationPrepaidBasiaMinor(),
            $config->getOpeningWalletBalancesJson() ?? [],
        );

        $items = $this->itemQuery->fetchItemsFromDate($reindexFrom, $settlementPartyId, false);

        foreach ($items as $item) {
            if ($item['operationDate'] > $dateTo) {
                break;
            }

            $fact = $this->classifier->classifyFact(
                $item,
                $settlementPartyId,
                $homeBudgetId,
                $maciekSources,
                $basiaSources,
                $walletOwners,
            );

            if ($fact !== null) {
                $engine->applyFact($fact);
            }
        }

        return $engine;
    }
}
