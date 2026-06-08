<?php

namespace App\Home\Transaction\Service;

use App\Home\Configuration\Entity\Category;
use App\Home\Configuration\Entity\Concern;
use App\Home\Configuration\Entity\Party;
use App\Home\Configuration\Entity\Wallet;
use App\Home\Transaction\Entity\Transaction;
use App\Home\Transaction\Entity\TransactionItem;
use App\Identity\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

class TransactionClassificationService
{
    public function __construct(
        private EntityManagerInterface $em,
    ) {}

    /**
     * Replaces all items on a transaction with the supplied payload.
     *
     * @param  array<int,array<string,mixed>> $itemsPayload
     * @throws \InvalidArgumentException on sum mismatch or unknown referenced entities
     */
    public function classifyTransaction(
        Transaction $tx,
        array       $itemsPayload,
        ?int        $paidFromPartyId,
        ?int        $paidToPartyId,
        User        $user,
    ): void {
        $sumMinor = array_reduce(
            $itemsPayload,
            fn(int $carry, array $item) => $carry + (int) round((float) ($item['amount'] ?? 0) * 100),
            0,
        );

        if ($sumMinor !== $tx->getAmountMinor()) {
            throw new \InvalidArgumentException(sprintf(
                'Suma pozycji (%d groszy) nie zgadza się z kwotą transakcji (%d groszy).',
                $sumMinor,
                $tx->getAmountMinor(),
            ));
        }

        if ($paidFromPartyId !== null) {
            $party = $this->em->find(Party::class, $paidFromPartyId);
            if (!$party) {
                throw new \InvalidArgumentException("Nie znaleziono podmiotu paidFrom id={$paidFromPartyId}.");
            }
            $tx->setPaidFromParty($party);
        }
        if ($paidToPartyId !== null) {
            $party = $this->em->find(Party::class, $paidToPartyId);
            if (!$party) {
                throw new \InvalidArgumentException("Nie znaleziono podmiotu paidTo id={$paidToPartyId}.");
            }
            $tx->setPaidToParty($party);
        }

        foreach ($tx->getItems()->toArray() as $old) {
            $tx->removeItem($old);
        }

        foreach ($itemsPayload as $payload) {
            $amountMinor = (int) round((float) ($payload['amount'] ?? 0) * 100);

            $item = new TransactionItem();
            $item->setAmountMinor($amountMinor);
            $item->setDescription($payload['description'] ?? null);
            $item->setCreatedBy($user);
            $item->setUpdatedBy($user);

            if (!empty($payload['walletId'])) {
                $wallet = $this->em->find(Wallet::class, (int) $payload['walletId']);
                if (!$wallet) {
                    throw new \InvalidArgumentException("Nie znaleziono portfela id={$payload['walletId']}.");
                }
                $item->setWallet($wallet);
            }
            if (!empty($payload['concernId'])) {
                $concern = $this->em->find(Concern::class, (int) $payload['concernId']);
                if (!$concern) {
                    throw new \InvalidArgumentException("Nie znaleziono obszaru id={$payload['concernId']}.");
                }
                $item->setConcern($concern);
            }
            if (!empty($payload['categoryId'])) {
                $category = $this->em->find(Category::class, (int) $payload['categoryId']);
                if (!$category) {
                    throw new \InvalidArgumentException("Nie znaleziono kategorii id={$payload['categoryId']}.");
                }
                $item->setCategory($category);
            }

            $tx->addItem($item);
        }

        $tx->setStatus($this->calculateStatus($tx));
        $tx->setUpdatedBy($user);

        $this->em->flush();
    }

    private function calculateStatus(Transaction $tx): string
    {
        $items = $tx->getItems()->toArray();

        if (empty($items)) {
            return Transaction::STATUS_UNCLASSIFIED;
        }

        $hasBothParties = $tx->getPaidFromParty() !== null && $tx->getPaidToParty() !== null;

        $classifiedCount = count(array_filter(
            $items,
            fn(TransactionItem $i) => $i->getWallet() !== null
                || $i->getConcern() !== null
                || $i->getCategory() !== null,
        ));

        $allClassified = $classifiedCount === count($items);
        $anyClassified = $classifiedCount > 0;

        if ($allClassified && $hasBothParties) {
            return Transaction::STATUS_CLASSIFIED;
        }

        if ($anyClassified) {
            return Transaction::STATUS_PARTIALLY_CLASSIFIED;
        }

        return Transaction::STATUS_UNCLASSIFIED;
    }
}
