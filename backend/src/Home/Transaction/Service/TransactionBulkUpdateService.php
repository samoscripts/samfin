<?php

namespace App\Home\Transaction\Service;

use App\Home\Configuration\Entity\Category;
use App\Home\Configuration\Entity\Concern;
use App\Home\Configuration\Entity\Party;
use App\Home\Configuration\Entity\Wallet;
use App\Home\Transaction\Entity\Transaction;
use App\Home\Transaction\Entity\TransactionItem;
use App\Home\Transaction\Repository\TransactionRepository;
use App\Identity\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

class TransactionBulkUpdateService
{
    private const ALLOWED_FIELDS = [
        'paidFromPartyId',
        'paidToPartyId',
        'walletId',
        'concernId',
        'categoryId',
    ];

    public function __construct(
        private EntityManagerInterface $em,
        private TransactionRepository $repository,
        private TransactionPartyAssignmentValidator $partyAssignmentValidator,
        private TransactionStatusCalculator $statusCalculator,
    ) {}

    /**
     * @param  int[]                            $transactionIds
     * @param  string[]                         $fields       subset of ALLOWED_FIELDS
     * @param  array<string, int|string|null>   $values       field => value (null clears)
     * @return int                              number of updated transactions
     * @throws \InvalidArgumentException
     */
    public function bulkUpdate(array $transactionIds, array $fields, array $values, User $user): int
    {
        $transactionIds = array_values(array_unique(array_map('intval', $transactionIds)));
        if (empty($transactionIds)) {
            throw new \InvalidArgumentException('Wymagana co najmniej jedna transakcja.');
        }

        $fields = array_values(array_intersect($fields, self::ALLOWED_FIELDS));
        if (empty($fields)) {
            throw new \InvalidArgumentException('Wybierz co najmniej jedno pole do aktualizacji.');
        }

        $transactions = [];
        foreach ($transactionIds as $id) {
            $tx = $this->repository->find($id);
            if (!$tx) {
                throw new \InvalidArgumentException("Nie znaleziono transakcji id={$id}.");
            }
            $transactions[] = $tx;
        }

        $directions = array_unique(array_map(fn(Transaction $t) => $t->getDirection(), $transactions));
        if (count($directions) > 1) {
            throw new \InvalidArgumentException(
                'Nie można edytować zbiorczo transakcji o różnym typie (wpływ i wydatek).',
            );
        }

        $paidFromParty = null;
        $paidToParty   = null;
        $wallet        = null;
        $concern       = null;
        $category      = null;

        if (in_array('paidFromPartyId', $fields, true)) {
            $paidFromParty = $this->resolveParty($values['paidFromPartyId'] ?? null, 'paidFrom');
        }
        if (in_array('paidToPartyId', $fields, true)) {
            $paidToParty = $this->resolveParty($values['paidToPartyId'] ?? null, 'paidTo');
        }
        if (in_array('walletId', $fields, true)) {
            $wallet = $this->resolveWallet($values['walletId'] ?? null);
        }
        if (in_array('concernId', $fields, true)) {
            $concern = $this->resolveConcern($values['concernId'] ?? null);
        }
        if (in_array('categoryId', $fields, true)) {
            $category = $this->resolveCategory($values['categoryId'] ?? null, $directions[0]);
        }

        $itemFields = array_intersect($fields, ['walletId', 'concernId', 'categoryId']);
        $partyFields = array_intersect($fields, ['paidFromPartyId', 'paidToPartyId']);

        foreach ($transactions as $tx) {
            $newPaidFrom = in_array('paidFromPartyId', $fields, true)
                ? $paidFromParty
                : $tx->getPaidFromParty();
            $newPaidTo = in_array('paidToPartyId', $fields, true)
                ? $paidToParty
                : $tx->getPaidToParty();

            if (!empty($partyFields)) {
                $this->partyAssignmentValidator->assertAssignment($tx, $newPaidFrom, $newPaidTo);
            }

            if (!empty($partyFields)) {
                if (in_array('paidFromPartyId', $fields, true)) {
                    $tx->setPaidFromParty($paidFromParty);
                }
                if (in_array('paidToPartyId', $fields, true)) {
                    $tx->setPaidToParty($paidToParty);
                }
            }

            if (!empty($itemFields)) {
                $items = $tx->getItems()->toArray();
                if (empty($items)) {
                    $item = new TransactionItem();
                    $item->setAmountMinor($tx->getAmountMinor());
                    $item->setCreatedBy($user);
                    $item->setUpdatedBy($user);
                    $tx->addItem($item);
                    $items = [$item];
                }

                foreach ($items as $item) {
                    if (in_array('walletId', $fields, true)) {
                        $item->setWallet($wallet);
                    }
                    if (in_array('concernId', $fields, true)) {
                        $item->setConcern($concern);
                    }
                    if (in_array('categoryId', $fields, true)) {
                        $item->setCategory($category);
                    }
                    $item->setUpdatedBy($user);
                }
            }

            $tx->setStatus($this->statusCalculator->calculate($tx));
            $tx->setUpdatedBy($user);
        }

        $this->em->flush();

        return count($transactions);
    }

    private function resolveParty(mixed $id, string $label): ?Party
    {
        if ($id === null || $id === '') {
            return null;
        }
        $party = $this->em->find(Party::class, (int) $id);
        if (!$party) {
            throw new \InvalidArgumentException("Nie znaleziono podmiotu {$label} id={$id}.");
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

    private function resolveConcern(mixed $id): ?Concern
    {
        if ($id === null || $id === '') {
            return null;
        }
        $concern = $this->em->find(Concern::class, (int) $id);
        if (!$concern) {
            throw new \InvalidArgumentException("Nie znaleziono obszaru id={$id}.");
        }

        return $concern;
    }

    private function resolveCategory(mixed $id, string $direction): ?Category
    {
        if ($id === null || $id === '') {
            return null;
        }
        $category = $this->em->find(Category::class, (int) $id);
        if (!$category) {
            throw new \InvalidArgumentException("Nie znaleziono kategorii id={$id}.");
        }
        if ($category->getType() !== $direction) {
            throw new \InvalidArgumentException('Kategoria nie pasuje do typu transakcji.');
        }

        return $category;
    }
}
