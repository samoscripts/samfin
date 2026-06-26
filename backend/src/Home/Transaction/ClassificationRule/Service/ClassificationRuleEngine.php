<?php

namespace App\Home\Transaction\ClassificationRule\Service;

use App\Home\Configuration\Entity\Party;
use App\Home\Transaction\ClassificationRule\Mapper\ClassificationRuleJsonMapper;
use App\Home\Transaction\ClassificationRule\Repository\ClassificationRuleRepository;
use App\Home\Transaction\ClassificationRule\ValueObject\PreparedClassificationRuleEntry;
use App\Home\Transaction\ClassificationRule\ValueObject\PreparedClassificationRules;
use App\Home\Transaction\Entity\Transaction;
use App\Identity\Entity\User;

class ClassificationRuleEngine
{
    public function __construct(
        private ClassificationRulePartyResolver        $partyResolver,
        private ClassificationRuleRepository           $ruleRepository,
        private ClassificationRuleJsonMapper           $mapper,
        private ClassificationRuleMatcher              $matcher,
        private ClassificationRuleApplier              $applier,
        private ClassificationRuleConditionsNormalizer   $conditionsNormalizer,
    ) {}

    public function prepareForParty(Party $party): PreparedClassificationRules
    {
        $rules = $this->ruleRepository->findActiveByPartyOrdered($party);
        $entries = [];

        foreach ($rules as $rule) {
            $partyId = $rule->getParty()?->getId();
            if ($partyId === null) {
                continue;
            }

            $conditionsJson = $this->conditionsNormalizer->normalize(
                $rule->getConditionsJson(),
                $this->conditionsNormalizer->inferDirectionFromActions($partyId, $rule->getActionsJson()),
            );

            $entries[] = new PreparedClassificationRuleEntry(
                (int) $rule->getId(),
                $this->mapper->mapConditions($conditionsJson),
                $rule->isStopOnMatch(),
            );
        }

        return new PreparedClassificationRules($entries);
    }

    /**
     * Applies matching rules to a transaction. Returns true when at least one rule was applied.
     */
    public function applyToTransaction(
        Transaction $tx,
        User $user,
        bool $overwrite,
        ?PreparedClassificationRules $prepared = null,
    ): bool {
        if (!$overwrite && $tx->getStatus() === Transaction::STATUS_CLASSIFIED) {
            return false;
        }

        if ($prepared !== null) {
            return $this->applyPreparedRules($tx, $user, $overwrite, $prepared);
        }

        $party = $this->partyResolver->resolve($tx);
        if ($party === null) {
            return false;
        }

        return $this->applyPreparedRules(
            $tx,
            $user,
            $overwrite,
            $this->prepareForParty($party),
        );
    }

    private function applyPreparedRules(
        Transaction $tx,
        User $user,
        bool $overwrite,
        PreparedClassificationRules $prepared,
    ): bool {
        $applied = false;

        foreach ($prepared->entries as $entry) {
            if (!$this->matcher->matches($tx, $entry->conditions)) {
                continue;
            }

            $rule = $this->ruleRepository->find($entry->ruleId);
            if ($rule === null) {
                continue;
            }

            $this->applier->applyRule($tx, $rule, $user, $overwrite);
            $applied = true;

            if ($entry->stopOnMatch) {
                break;
            }
        }

        return $applied;
    }
}
