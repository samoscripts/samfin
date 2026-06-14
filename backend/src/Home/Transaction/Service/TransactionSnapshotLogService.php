<?php

namespace App\Home\Transaction\Service;

use App\Home\Transaction\Entity\Transaction;
use App\Home\Transaction\Entity\TransactionChangeLog;
use App\Home\Transaction\Entity\TransactionItem;
use App\Home\Transaction\Repository\TransactionChangeLogRepository;
use App\Identity\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

class TransactionSnapshotLogService
{
    public function __construct(
        private EntityManagerInterface $em,
        private TransactionChangeLogRepository $changeLogRepository,
    ) {}

    public function log(Transaction $tx, User $user): TransactionChangeLog
    {
        $entry = new TransactionChangeLog();
        $entry->setTransaction($tx);
        $entry->setSnapshotJson($this->buildSnapshot($tx));
        $entry->setCreatedBy($user);
        $entry->setCreatedAt(new \DateTimeImmutable());

        $this->em->persist($entry);
        $this->em->flush();

        return $entry;
    }

    /**
     * @return array{data: array<int,array<string,mixed>>, meta: array<string,int>}
     */
    public function getHistory(Transaction $tx, int $page, int $perPage): array
    {
        $result = $this->changeLogRepository->findPagedForTransaction($tx, $page, $perPage);
        $total = $result['total'];
        $lastPage = max(1, (int) ceil($total / $perPage));

        return [
            'data' => array_map(
                fn(TransactionChangeLog $e) => $e->toApiArray(),
                $result['items'],
            ),
            'meta' => [
                'total'    => $total,
                'page'     => $page,
                'perPage'  => $perPage,
                'lastPage' => $lastPage,
            ],
        ];
    }

    public function findEntry(Transaction $tx, int $changeId): ?TransactionChangeLog
    {
        return $this->changeLogRepository->findForTransaction($tx, $changeId);
    }

    /**
     * @return array<string,mixed>
     */
    public function buildSnapshot(Transaction $tx): array
    {
        return [
            'paidFromPartyId' => $tx->getPaidFromParty()?->getId(),
            'paidFrom'        => $tx->getPaidFromParty()?->getName(),
            'paidToPartyId'   => $tx->getPaidToParty()?->getId(),
            'paidTo'          => $tx->getPaidToParty()?->getName(),
            'items'           => array_values(array_map(
                fn(TransactionItem $item) => [
                    'amount'      => round($item->getAmountMinor() / 100, 2),
                    'description' => $item->getDescription(),
                    'walletId'    => $item->getWallet()?->getId(),
                    'wallet'      => $item->getWallet()?->getName(),
                    'concernId'   => $item->getConcern()?->getId(),
                    'concern'     => $item->getConcern()?->getName(),
                    'categoryId'  => $item->getCategory()?->getId(),
                    'category'    => $item->getCategory()?->getName(),
                ],
                $tx->getItems()->toArray(),
            )),
        ];
    }

    /**
     * @return array{items: array<int,array<string,mixed>>, paidFromPartyId: ?int, paidToPartyId: ?int}
     */
    public function snapshotToClassifyPayload(array $snapshot): array
    {
        $items = [];
        foreach ($snapshot['items'] ?? [] as $item) {
            $items[] = [
                'amount'      => (float) ($item['amount'] ?? 0),
                'walletId'    => $item['walletId'] ?? null,
                'concernId'   => $item['concernId'] ?? null,
                'categoryId'  => $item['categoryId'] ?? null,
                'description' => $item['description'] ?? null,
            ];
        }

        return [
            'items'           => $items,
            'paidFromPartyId' => $snapshot['paidFromPartyId'] ?? null,
            'paidToPartyId'   => $snapshot['paidToPartyId'] ?? null,
        ];
    }
}
