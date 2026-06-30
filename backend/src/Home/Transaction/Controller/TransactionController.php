<?php

namespace App\Home\Transaction\Controller;

use App\Home\Transaction\ClassificationRule\Service\ClassificationRuleApplyService;
use App\Home\Transaction\DTO\TransactionFilterCriteria;
use App\Home\Transaction\DTO\TransactionListQuery;
use App\Home\Transaction\DTO\TransactionStatsQuery;
use App\Home\Transaction\Entity\Transaction;
use App\Home\Transaction\Repository\TransactionRepository;
use App\Shared\DTO\QueryValidationErrors;
use App\Home\Transaction\Service\TransactionBulkUpdateService;
use App\Home\Transaction\Service\TransactionClassificationService;
use App\Home\Transaction\Service\TransactionCreateService;
use App\Home\Transaction\Service\TransactionDeleteService;
use App\Home\Transaction\Service\TransactionSnapshotLogService;
use App\Identity\Entity\User;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/transactions')]
class TransactionController extends AbstractController
{
    public function __construct(
        private TransactionRepository            $repository,
        private TransactionClassificationService $classificationService,
        private TransactionBulkUpdateService     $bulkUpdateService,
        private ClassificationRuleApplyService     $classificationRuleApplyService,
        private TransactionSnapshotLogService    $snapshotLogService,
        private TransactionCreateService         $createService,
        private TransactionDeleteService         $deleteService,
        private Security                         $security,
    ) {}

    #[Route('/stats', name: 'api_transactions_stats', methods: ['GET'])]
    public function stats(Request $request): JsonResponse
    {
        $query = TransactionStatsQuery::fromInputBag($request->query);
        if ($query instanceof QueryValidationErrors) {
            return $this->json($query->toArray(), 422);
        }

        return $this->json($this->repository->getPeriodStats($query->toRepositoryFilters()));
    }

    #[Route('', name: 'api_transactions_index', methods: ['GET'])]
    public function index(Request $request): JsonResponse
    {
        $query = TransactionListQuery::fromInputBag($request->query);
        if ($query instanceof QueryValidationErrors) {
            return $this->json($query->toArray(), 422);
        }

        $result = $this->repository->findPaged(
            $query->toRepositoryFilters(),
            $query->sortField,
            $query->sortDir,
            $query->page,
            $query->perPage,
        );

        $total    = $result['total'];
        $lastPage = max(1, (int) ceil($total / $query->perPage));

        return $this->json([
            'data' => array_map(fn(Transaction $t) => $t->toApiArray(), $result['items']),
            'meta' => [
                'total'    => $total,
                'page'     => $query->page,
                'perPage'  => $query->perPage,
                'lastPage' => $lastPage,
            ],
        ]);
    }

    #[Route('', name: 'api_transactions_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $body = json_decode($request->getContent(), true) ?? [];

        $direction = $body['direction'] ?? null;
        $transDate = $body['transDate'] ?? $body['date'] ?? $body['operationDate'] ?? null;
        $amount    = $body['amount'] ?? null;
        $transDescription = $body['transDescription'] ?? $body['operationDesc'] ?? $body['description'] ?? null;
        $transTitle = $body['transTitle'] ?? $body['operationTitle'] ?? null;

        if (!is_string($direction) || $direction === '') {
            return $this->json(['message' => 'Pole direction jest wymagane.'], 422);
        }
        if (!is_string($transDate) || $transDate === '') {
            return $this->json(['message' => 'Pole transDate jest wymagane.'], 422);
        }
        if ($amount === null || $amount === '') {
            return $this->json(['message' => 'Pole amount jest wymagane.'], 422);
        }
        if (!is_string($transDescription) || trim($transDescription) === '') {
            return $this->json(['message' => 'Pole transDescription jest wymagane.'], 422);
        }

        $paidFromPartyId = array_key_exists('paidFromPartyId', $body)
            ? ($body['paidFromPartyId'] !== null && $body['paidFromPartyId'] !== ''
                ? (int) $body['paidFromPartyId']
                : null)
            : null;

        $paidToPartyId = array_key_exists('paidToPartyId', $body)
            ? ($body['paidToPartyId'] !== null && $body['paidToPartyId'] !== ''
                ? (int) $body['paidToPartyId']
                : null)
            : null;

        $items = $body['items'] ?? null;
        if ($items !== null && !is_array($items)) {
            return $this->json(['message' => 'Pole items musi być tablicą.'], 422);
        }

        $transCustomDescription = null;
        if (array_key_exists('transCustomDescription', $body)) {
            $raw = $body['transCustomDescription'];
            $transCustomDescription = is_string($raw) ? $raw : null;
        }

        /** @var User $user */
        $user = $this->security->getUser();

        try {
            $tx = $this->createService->createManual(
                $direction,
                $transDate,
                (float) $amount,
                $transDescription,
                is_string($transTitle) ? $transTitle : null,
                $transCustomDescription,
                $paidFromPartyId,
                $paidToPartyId,
                $items,
                $user,
            );
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], 422);
        }

        return $this->json($tx->toApiArray(), 201);
    }

    #[Route('/bulk-update', name: 'api_transactions_bulk_update', methods: ['PUT'])]
    public function bulkUpdate(Request $request): JsonResponse
    {
        $body = json_decode($request->getContent(), true) ?? [];

        $transactionIds = $body['transactionIds'] ?? [];
        $fields         = $body['fields'] ?? [];
        $values         = $body['values'] ?? [];

        if (!is_array($transactionIds) || empty($transactionIds)) {
            return $this->json(['message' => 'Pole transactionIds jest wymagane.'], 422);
        }
        if (!is_array($fields) || empty($fields)) {
            return $this->json(['message' => 'Wybierz co najmniej jedno pole do aktualizacji.'], 422);
        }
        if (!is_array($values)) {
            return $this->json(['message' => 'Pole values jest wymagane.'], 422);
        }

        /** @var User $user */
        $user = $this->security->getUser();

        try {
            $updated = $this->bulkUpdateService->bulkUpdate($transactionIds, $fields, $values, $user);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], 422);
        }

        return $this->json(['updated' => $updated]);
    }

    #[Route('/apply-classification-rules', name: 'api_transactions_apply_classification_rules', methods: ['POST'])]
    public function applyClassificationRules(Request $request): JsonResponse
    {
        $body = json_decode($request->getContent(), true) ?? [];

        $transactionIds = $body['transactionIds'] ?? null;
        $filters        = $body['filters'] ?? null;
        $overwrite      = (bool) ($body['overwrite'] ?? false);

        if ($transactionIds !== null && $filters !== null) {
            return $this->json(['message' => 'Podaj transactionIds albo filters, nie oba.'], 422);
        }
        if ($transactionIds === null && $filters === null) {
            return $this->json(['message' => 'Pole transactionIds lub filters jest wymagane.'], 422);
        }

        /** @var User $user */
        $user = $this->security->getUser();

        try {
            if (is_array($transactionIds)) {
                $result = $this->classificationRuleApplyService->applyByIds(
                    array_map('intval', $transactionIds),
                    $user,
                    $overwrite,
                );
            } else {
                if (!is_array($filters)) {
                    return $this->json(['message' => 'Pole filters musi być obiektem.'], 422);
                }
                $result = $this->classificationRuleApplyService->applyByFilters(
                    TransactionFilterCriteria::fromArray($filters)->toRepositoryFilters(),
                    $user,
                    $overwrite,
                );
            }
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], 422);
        }

        return $this->json($result);
    }

    #[Route('/{id}', name: 'api_transactions_show', methods: ['GET'], requirements: ['id' => '\d+'])]
    public function show(int $id): JsonResponse
    {
        $tx = $this->repository->find($id);
        if (!$tx) {
            return $this->json(['message' => 'Nie znaleziono transakcji.'], 404);
        }

        return $this->json($tx->toApiArray());
    }

    #[Route('/{id}', name: 'api_transactions_delete', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    public function delete(int $id): JsonResponse
    {
        /** @var User $user */
        $user = $this->security->getUser();

        if (!$this->deleteService->deleteById($id, $user)) {
            return $this->json(['message' => 'Nie znaleziono transakcji.'], 404);
        }

        return $this->json(null, 204);
    }

    #[Route('/{id}/history', name: 'api_transactions_history', methods: ['GET'], requirements: ['id' => '\d+'])]
    public function history(int $id, Request $request): JsonResponse
    {
        $tx = $this->repository->find($id);
        if (!$tx) {
            return $this->json(['message' => 'Nie znaleziono transakcji.'], 404);
        }

        $page    = max(1, (int) $request->query->get('page', 1));
        $perPage = min(50, max(1, (int) $request->query->get('perPage', 10)));

        return $this->json($this->snapshotLogService->getHistory($tx, $page, $perPage));
    }

    #[Route('/{id}/history/{changeId}/restore', name: 'api_transactions_history_restore', methods: ['POST'], requirements: ['id' => '\d+', 'changeId' => '\d+'])]
    public function restoreHistory(int $id, int $changeId): JsonResponse
    {
        $tx = $this->repository->find($id);
        if (!$tx) {
            return $this->json(['message' => 'Nie znaleziono transakcji.'], 404);
        }

        $entry = $this->snapshotLogService->findEntry($tx, $changeId);
        if (!$entry) {
            return $this->json(['message' => 'Nie znaleziono wpisu historii.'], 404);
        }

        /** @var User $user */
        $user = $this->security->getUser();
        $payload = $this->snapshotLogService->snapshotToClassifyPayload($entry->getSnapshotJson());

        try {
            $this->classificationService->classifyTransaction(
                $tx,
                $payload['items'],
                $payload['paidFromPartyId'],
                $payload['paidToPartyId'],
                $user,
            );
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], 422);
        }

        return $this->json($tx->toApiArray());
    }

    #[Route('/{id}/items', name: 'api_transactions_classify', methods: ['PUT'], requirements: ['id' => '\d+'])]
    public function classifyItems(int $id, Request $request): JsonResponse
    {
        $tx = $this->repository->find($id);
        if (!$tx) {
            return $this->json(['message' => 'Nie znaleziono transakcji.'], 404);
        }

        $body = json_decode($request->getContent(), true) ?? [];

        $itemsPayload = $body['items'] ?? [];

        $paidFromPartyId = array_key_exists('paidFromPartyId', $body)
            ? ($body['paidFromPartyId'] !== null && $body['paidFromPartyId'] !== ''
                ? (int) $body['paidFromPartyId']
                : null)
            : null;

        $paidToPartyId = array_key_exists('paidToPartyId', $body)
            ? ($body['paidToPartyId'] !== null && $body['paidToPartyId'] !== ''
                ? (int) $body['paidToPartyId']
                : null)
            : null;

        if (!is_array($itemsPayload) || empty($itemsPayload)) {
            return $this->json(['message' => 'Pole items jest wymagane i nie może być puste.'], 422);
        }

        $updateTransCustomDescription = array_key_exists('transCustomDescription', $body);
        $transCustomDescription = null;
        if ($updateTransCustomDescription) {
            $raw = $body['transCustomDescription'];
            $transCustomDescription = is_string($raw) ? $raw : null;
        }

        /** @var User $user */
        $user = $this->security->getUser();

        try {
            $this->classificationService->classifyTransaction(
                $tx,
                $itemsPayload,
                $paidFromPartyId,
                $paidToPartyId,
                $user,
                $transCustomDescription,
                $updateTransCustomDescription,
            );
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], 422);
        }

        return $this->json($tx->toApiArray());
    }
}
