<?php

namespace App\Home\Transaction\Service;

use App\Home\Transaction\Entity\Transaction;
use App\Home\Transaction\Entity\TransactionItem;
use App\Identity\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

class TransactionCreateService
{
    public function __construct(
        private EntityManagerInterface $em,
        private TransactionPartyAssignmentValidator $partyAssignmentValidator,
        private TransactionClassificationService $classificationService,
        private TransactionStatusCalculator $statusCalculator,
    ) {}

    /**
     * @param array<int,array<string,mixed>>|null $itemsPayload
     */
    public function createManual(
        string $direction,
        string $transDate,
        float $amount,
        string $transDescription,
        ?string $transTitle,
        ?string $transCustomDescription,
        ?int $paidFromPartyId,
        ?int $paidToPartyId,
        ?array $itemsPayload,
        User $user,
    ): Transaction {
        if (!in_array($direction, [Transaction::DIRECTION_INCOME, Transaction::DIRECTION_EXPENSE], true)) {
            throw new \InvalidArgumentException('Nieprawidłowy kierunek transakcji.');
        }

        $transDescription = trim($transDescription);
        if ($transDescription === '') {
            throw new \InvalidArgumentException('Opis transakcji jest wymagany.');
        }

        if ($amount <= 0) {
            throw new \InvalidArgumentException('Kwota musi być większa od zera.');
        }

        try {
            $date = new \DateTimeImmutable($transDate);
        } catch (\Exception) {
            throw new \InvalidArgumentException('Nieprawidłowa data operacji.');
        }

        $amountMinor = (int) round($amount * 100);
        if ($direction === Transaction::DIRECTION_EXPENSE) {
            $amountMinor = -abs($amountMinor);
        } else {
            $amountMinor = abs($amountMinor);
        }

        $tx = new Transaction();
        $tx->setTransDate($date);
        $tx->setTransDescription($transDescription);
        if ($transTitle !== null && trim($transTitle) !== '') {
            $tx->setTransTitle(trim($transTitle));
        }
        $tx->setTransCustomDescription(self::normalizeCustomDescription($transCustomDescription));
        $tx->setAmountMinor($amountMinor);
        $tx->setDirection($direction);
        $tx->setSource(Transaction::SOURCE_MANUAL);
        $tx->setCreatedBy($user);
        $tx->setUpdatedBy($user);

        $paidFromParty = null;
        $paidToParty   = null;

        if ($paidFromPartyId !== null) {
            $paidFromParty = $this->em->find(\App\Home\Configuration\Entity\Party::class, $paidFromPartyId);
            if (!$paidFromParty) {
                throw new \InvalidArgumentException("Nie znaleziono podmiotu paidFrom id={$paidFromPartyId}.");
            }
        }

        if ($paidToPartyId !== null) {
            $paidToParty = $this->em->find(\App\Home\Configuration\Entity\Party::class, $paidToPartyId);
            if (!$paidToParty) {
                throw new \InvalidArgumentException("Nie znaleziono podmiotu paidTo id={$paidToPartyId}.");
            }
        }

        $this->partyAssignmentValidator->assertAssignment($tx, $paidFromParty, $paidToParty);
        $tx->setPaidFromParty($paidFromParty);
        $tx->setPaidToParty($paidToParty);

        $this->em->persist($tx);

        $hasClassification = is_array($itemsPayload) && $itemsPayload !== [];

        if ($hasClassification) {
            $this->em->flush();
            $this->classificationService->classifyTransaction(
                $tx,
                $itemsPayload,
                $paidFromPartyId,
                $paidToPartyId,
                $user,
            );
        } else {
            $item = new TransactionItem();
            $item->setAmountMinor($amountMinor);
            $item->setCreatedBy($user);
            $item->setUpdatedBy($user);
            $tx->addItem($item);
            $tx->setStatus($this->statusCalculator->calculate($tx));
            $this->em->flush();
        }

        return $tx;
    }

    private static function normalizeCustomDescription(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }
}
