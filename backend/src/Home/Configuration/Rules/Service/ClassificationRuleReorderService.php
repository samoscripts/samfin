<?php

namespace App\Home\Configuration\Rules\Service;

use App\Home\Configuration\General\Entity\Party;
use App\Home\Configuration\Rules\Entity\ClassificationRule;
use App\Home\Configuration\Rules\Repository\ClassificationRuleRepository;
use App\Identity\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

class ClassificationRuleReorderService
{
    public function __construct(
        private EntityManagerInterface $em,
        private ClassificationRuleRepository $ruleRepository,
    ) {}

    /**
     * @param int[] $orderedRuleIds
     * @throws \InvalidArgumentException
     */
    public function reorder(Party $party, array $orderedRuleIds, User $user): void
    {
        $orderedRuleIds = array_values(array_map('intval', $orderedRuleIds));
        $existing = $this->ruleRepository->findAllByParty($party);
        $existingIds = array_map(fn (ClassificationRule $r) => $r->getId(), $existing);

        sort($existingIds);
        $sortedRequested = $orderedRuleIds;
        sort($sortedRequested);

        if ($sortedRequested !== $existingIds) {
            throw new \InvalidArgumentException(
                'Lista ID musi zawierać dokładnie wszystkie aktywne reguły podmiotu.',
            );
        }

        $byId = [];
        foreach ($existing as $rule) {
            $byId[$rule->getId()] = $rule;
        }

        $priority = 1;
        foreach ($orderedRuleIds as $id) {
            $rule = $byId[$id] ?? null;
            if ($rule === null) {
                throw new \InvalidArgumentException("Nie znaleziono reguły id={$id}.");
            }
            $rule->setPriority($priority);
            $rule->setUpdatedBy($user);
            ++$priority;
        }

        $this->em->flush();
    }
}
