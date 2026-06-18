<?php

namespace App\Home\Transaction\ClassificationRule\Service;

use App\Home\Transaction\ClassificationRule\Entity\ClassificationRule;
use App\Home\Transaction\ClassificationRule\Exception\ClassificationRuleApplicationException;
use App\Home\Transaction\ClassificationRule\Mapper\ClassificationRuleJsonMapper;
use App\Home\Transaction\Entity\Transaction;
use App\Home\Transaction\Service\TransactionClassificationService;
use App\Identity\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

class ClassificationRuleApplier
{
    public function __construct(
        private ClassificationRuleJsonMapper      $mapper,
        private ClassificationRulePayloadMerger   $merger,
        private TransactionClassificationService  $classificationService,
        private EntityManagerInterface            $em,
    ) {}

    public function applyRule(Transaction $tx, ClassificationRule $rule, User $user, bool $overwrite): void
    {
        $actions = $this->mapper->mapActions($rule->getActionsJson());
        $payload = $this->merger->buildClassifyPayload($tx, $actions, $overwrite);

        try {
            $this->classificationService->classifyTransaction(
                $tx,
                $payload['items'],
                $payload['paidFromPartyId'],
                $payload['paidToPartyId'],
                $user,
            );
        } catch (\InvalidArgumentException $e) {
            throw ClassificationRuleApplicationException::fromFailure(
                $tx,
                $rule,
                $actions,
                $payload,
                $e,
                $this->em,
            );
        }
    }
}
