<?php

namespace App\Home\Configuration\Rules\Service;

use App\Home\Transaction\Entity\Transaction;
use App\Home\Transaction\Repository\TransactionRepository;
use App\Identity\Entity\User;

class ClassificationRuleApplyService
{
    public const MAX_FILTER_BATCH = 10_000;

    public function __construct(
        private TransactionRepository        $transactionRepository,
        private ClassificationRuleEngine     $engine,
        private ClassificationRulePartyResolver $partyResolver,
    ) {}

    /**
     * @param int[] $transactionIds
     * @return array{applied: int, skipped: int, noPartyContext: int, errors: array<int, string>}
     */
    public function applyByIds(array $transactionIds, User $user, bool $overwrite): array
    {
        $stats = ['applied' => 0, 'skipped' => 0, 'noPartyContext' => 0, 'errors' => []];

        foreach ($transactionIds as $id) {
            $tx = $this->transactionRepository->find((int) $id);
            if (!$tx) {
                $stats['errors'][(int) $id] = 'Nie znaleziono transakcji.';
                continue;
            }

            $this->applyOne($tx, $user, $overwrite, $stats);
        }

        return $stats;
    }

    /**
     * @return array{applied: int, skipped: int, noPartyContext: int, errors: array<int, string>}
     */
    public function applyByFilters(array $filters, User $user, bool $overwrite): array
    {
        $ids = $this->transactionRepository->findIdsForFilters($filters, self::MAX_FILTER_BATCH + 1);
        if (count($ids) > self::MAX_FILTER_BATCH) {
            throw new \InvalidArgumentException(sprintf(
                'Zbyt wiele transakcji (%d). Maksimum: %d.',
                count($ids),
                self::MAX_FILTER_BATCH,
            ));
        }

        return $this->applyByIds($ids, $user, $overwrite);
    }

  /** @param array{applied: int, skipped: int, noPartyContext: int, errors: array<int, string>} $stats */
    private function applyOne(Transaction $tx, User $user, bool $overwrite, array &$stats): void
    {
        if ($this->partyResolver->resolve($tx) === null) {
            $stats['noPartyContext']++;
            return;
        }

        try {
            if ($this->engine->applyToTransaction($tx, $user, $overwrite)) {
                $stats['applied']++;
            } else {
                $stats['skipped']++;
            }
        } catch (\InvalidArgumentException $e) {
            $stats['errors'][$tx->getId()] = $e->getMessage();
        }
    }
}
