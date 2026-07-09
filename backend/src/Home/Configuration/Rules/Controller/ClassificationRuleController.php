<?php

namespace App\Home\Configuration\Rules\Controller;

use App\Home\Configuration\General\Entity\Party;
use App\Home\Configuration\General\Repository\PartyRepository;
use App\Home\Configuration\Rules\Entity\ClassificationRule;
use App\Home\Configuration\Rules\Repository\ClassificationRuleRepository;
use App\Home\Configuration\Rules\Service\ClassificationRuleDefinitionValidator;
use App\Home\Configuration\Rules\Service\ClassificationRuleReorderService;
use App\Home\Report\Settlement\Service\SettlementIndexStateService;
use App\Home\Transaction\Repository\TransactionRepository;
use App\Identity\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/parties/{partyId}/classification-rules')]
class ClassificationRuleController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface               $em,
        private PartyRepository                      $partyRepository,
        private ClassificationRuleRepository         $ruleRepository,
        private TransactionRepository                $transactionRepository,
        private ClassificationRuleDefinitionValidator $validator,
        private ClassificationRuleReorderService     $reorderService,
        private SettlementIndexStateService          $settlementIndexStateService,
        private Security                             $security,
    ) {}

    #[Route('', name: 'api_classification_rules_index', methods: ['GET'])]
    public function index(int $partyId): JsonResponse
    {
        $party = $this->requireParty($partyId);
        if ($party instanceof JsonResponse) {
            return $party;
        }

        return $this->json(array_map(
            fn (ClassificationRule $r) => $r->toApiArray(),
            $this->ruleRepository->findAllByParty($party),
        ));
    }

    #[Route('/{id}', name: 'api_classification_rules_show', methods: ['GET'], requirements: ['id' => '\d+'])]
    public function show(int $partyId, int $id): JsonResponse
    {
        $rule = $this->requireRule($partyId, $id);
        if ($rule instanceof JsonResponse) {
            return $rule;
        }

        return $this->json($rule->toApiArray());
    }

    #[Route('', name: 'api_classification_rules_create', methods: ['POST'])]
    public function create(int $partyId, Request $request): JsonResponse
    {
        $party = $this->requireParty($partyId);
        if ($party instanceof JsonResponse) {
            return $party;
        }

        $data = json_decode($request->getContent(), true) ?? [];

        try {
            $rule = $this->buildFromPayload(new ClassificationRule(), $party, $data, true);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], 422);
        }

        if (!array_key_exists('priority', $data)) {
            $rule->setPriority($this->ruleRepository->getNextPriorityForParty($party));
        }

        /** @var User $user */
        $user = $this->security->getUser();
        $rule->setCreatedBy($user);
        $rule->setUpdatedBy($user);

        $this->em->persist($rule);
        $this->em->flush();
        $this->markSettlementDirty();

        return $this->json($rule->toApiArray(), 201);
    }

    #[Route('/reorder', name: 'api_classification_rules_reorder', methods: ['PUT'], priority: 10)]
    public function reorder(int $partyId, Request $request): JsonResponse
    {
        $party = $this->requireParty($partyId);
        if ($party instanceof JsonResponse) {
            return $party;
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $orderedRuleIds = $data['orderedRuleIds'] ?? null;
        if (!is_array($orderedRuleIds)) {
            return $this->json(['message' => 'Pole orderedRuleIds jest wymagane.'], 422);
        }

        /** @var User $user */
        $user = $this->security->getUser();

        try {
            $this->reorderService->reorder($party, $orderedRuleIds, $user);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], 422);
        }

        $this->markSettlementDirty();

        return $this->json(['updated' => count($orderedRuleIds)]);
    }

    #[Route('/{id}', name: 'api_classification_rules_update', methods: ['PUT'], requirements: ['id' => '\d+'])]
    public function update(int $partyId, int $id, Request $request): JsonResponse
    {
        $rule = $this->requireRule($partyId, $id);
        if ($rule instanceof JsonResponse) {
            return $rule;
        }

        $data = json_decode($request->getContent(), true) ?? [];

        try {
            $targetParty = $rule->getParty();
            if (isset($data['partyId'])) {
                $moved = $this->partyRepository->find((int) $data['partyId']);
                if (!$moved) {
                    return $this->json(['message' => 'Nie znaleziono podmiotu docelowego.'], 404);
                }
                $targetParty = $moved;
            }
            $this->buildFromPayload($rule, $targetParty, $data, false);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], 422);
        }

        /** @var User $user */
        $user = $this->security->getUser();
        $rule->setUpdatedBy($user);

        $this->em->flush();
        $this->markSettlementDirty();

        return $this->json($rule->toApiArray());
    }

    #[Route('/{id}', name: 'api_classification_rules_delete', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    public function delete(int $partyId, int $id): JsonResponse
    {
        $rule = $this->requireRule($partyId, $id);
        if ($rule instanceof JsonResponse) {
            return $rule;
        }

        /** @var User $user */
        $user = $this->security->getUser();

        $rule->setActive(false);
        $rule->setUpdatedBy($user);
        $this->em->flush();
        $this->markSettlementDirty();

        return $this->json(null, 204);
    }

    private function markSettlementDirty(): void
    {
        /** @var User $user */
        $user = $this->security->getUser();
        $this->settlementIndexStateService->markDirty($user);
    }

    private function requireParty(int $partyId): Party|JsonResponse
    {
        $party = $this->partyRepository->find($partyId);
        if (!$party) {
            return $this->json(['message' => 'Nie znaleziono podmiotu.'], 404);
        }

        return $party;
    }

    private function requireRule(int $partyId, int $id): ClassificationRule|JsonResponse
    {
        $rule = $this->ruleRepository->find($id);
        if (!$rule || !$rule->isActive() || $rule->getParty()?->getId() !== $partyId) {
            return $this->json(['message' => 'Nie znaleziono reguły.'], 404);
        }

        return $rule;
    }

    /** @param array<string, mixed> $data */
    private function buildFromPayload(
        ClassificationRule $rule,
        Party              $party,
        array              $data,
        bool               $isCreate,
    ): ClassificationRule {
        if ($isCreate || array_key_exists('name', $data)) {
            $name = trim((string) ($data['name'] ?? ''));
            if ($name === '') {
                throw new \InvalidArgumentException('Pole name jest wymagane.');
            }
            $rule->setName($name);
        }

        if (array_key_exists('description', $data)) {
            $desc = $data['description'];
            $rule->setDescription($desc !== null && $desc !== '' ? (string) $desc : null);
        }

        if (array_key_exists('priority', $data)) {
            $rule->setPriority((int) $data['priority']);
        }

        if (array_key_exists('enabled', $data)) {
            $rule->setEnabled((bool) $data['enabled']);
        }

        if (array_key_exists('stopOnMatch', $data)) {
            $rule->setStopOnMatch((bool) $data['stopOnMatch']);
        }

        if (array_key_exists('conditions', $data)) {
            if (!is_array($data['conditions'])) {
                throw new \InvalidArgumentException('Pole conditions musi być obiektem.');
            }
            $fallbackDirection = null;
            if (array_key_exists('actions', $data) && is_array($data['actions'])) {
                $fallbackDirection = $this->validator->inferDirectionFromActions(
                    $party->getId(),
                    $data['actions'],
                );
            }
            $normalized = $this->validator->normalizeConditions($data['conditions'], $fallbackDirection);
            $rule->setConditionsJson($normalized);
        } elseif ($isCreate) {
            throw new \InvalidArgumentException('Pole conditions jest wymagane.');
        }

        if (array_key_exists('actions', $data)) {
            if (!is_array($data['actions'])) {
                throw new \InvalidArgumentException('Pole actions musi być obiektem.');
            }
            $this->validator->validateActions($data['actions']);
            $rule->setActionsJson($data['actions']);
        } elseif ($isCreate) {
            throw new \InvalidArgumentException('Pole actions jest wymagane.');
        }

        if (array_key_exists('createdFromTransactionId', $data)) {
            $txId = $data['createdFromTransactionId'];
            if ($txId === null) {
                $rule->setCreatedFromTransaction(null);
            } else {
                $tx = $this->transactionRepository->find((int) $txId);
                if (!$tx) {
                    throw new \InvalidArgumentException('Nie znaleziono transakcji źródłowej.');
                }
                $rule->setCreatedFromTransaction($tx);
            }
        }

        $rule->setParty($party);

        $this->normalizeRuleConditionsIfNeeded($rule);

        return $rule;
    }

    private function normalizeRuleConditionsIfNeeded(ClassificationRule $rule): void
    {
        $partyId = $rule->getParty()?->getId();
        if ($partyId === null) {
            return;
        }

        $normalized = $this->validator->normalizeConditions(
            $rule->getConditionsJson(),
            $this->validator->inferDirectionFromActions($partyId, $rule->getActionsJson()),
        );
        $rule->setConditionsJson($normalized);
    }
}
