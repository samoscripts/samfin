<?php

namespace App\Home\Transaction\ClassificationRule\Service;

use App\Home\Transaction\ClassificationRule\Entity\ClassificationRule;
use App\Home\Transaction\ClassificationRule\Mapper\ClassificationRuleJsonMapper;
use App\Home\Transaction\ClassificationRule\Repository\ClassificationRuleRepository;
use App\Home\Transaction\Entity\Transaction;
use App\Home\Transaction\Service\TransactionClassificationService;
use App\Identity\Entity\User;

class ClassificationRuleApplier
{
    public function __construct(
        private ClassificationRuleJsonMapper      $mapper,
        private ClassificationRulePayloadMerger   $merger,
        private TransactionClassificationService  $classificationService,
    ) {}

    public function applyRule(Transaction $tx, ClassificationRule $rule, User $user, bool $overwrite): void
    {
        $actions = $this->mapper->mapActions($rule->getActionsJson());
        $payload = $this->merger->buildClassifyPayload($tx, $actions, $overwrite);

        $this->classificationService->classifyTransaction(
            $tx,
            $payload['items'],
            $payload['paidFromPartyId'],
            $payload['paidToPartyId'],
            $user,
        );
    }
}
