<?php

namespace App\Home\Transaction\ClassificationRule\Service;

use App\Home\Transaction\ClassificationRule\Mapper\ClassificationRuleJsonMapper;
use App\Home\Transaction\ClassificationRule\Repository\ClassificationRuleRepository;
use App\Home\Transaction\Entity\Transaction;
use App\Identity\Entity\User;

class ClassificationRuleEngine
{
    public function __construct(
        private ClassificationRulePartyResolver   $partyResolver,
        private ClassificationRuleRepository      $ruleRepository,
        private ClassificationRuleJsonMapper      $mapper,
        private ClassificationRuleMatcher         $matcher,
        private ClassificationRuleApplier           $applier,
    ) {}

    /**
     * Applies matching rules to a transaction. Returns true when at least one rule was applied.
     */
    public function applyToTransaction(Transaction $tx, User $user, bool $overwrite): bool
    {
        if (!$overwrite && $tx->getStatus() === Transaction::STATUS_CLASSIFIED) {
            return false;
        }

        $party = $this->partyResolver->resolve($tx);
        if ($party === null) {
            return false;
        }

        $rules = $this->ruleRepository->findActiveByPartyOrdered($party);
        $applied = false;

        foreach ($rules as $rule) {
            $conditions = $this->mapper->mapConditions($rule->getConditionsJson());
            if (!$this->matcher->matches($tx, $conditions)) {
                continue;
            }

            $this->applier->applyRule($tx, $rule, $user, $overwrite);
            $applied = true;

            if ($rule->isStopOnMatch()) {
                break;
            }
        }

        return $applied;
    }
}
