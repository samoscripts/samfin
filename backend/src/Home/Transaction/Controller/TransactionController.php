<?php

namespace App\Home\Transaction\Controller;

use App\Home\Transaction\ClassificationRule\Service\ClassificationRuleApplyService;
use App\Home\Transaction\Entity\Transaction;
use App\Home\Transaction\Repository\TransactionRepository;
use App\Home\Transaction\Service\TransactionBulkUpdateService;
use App\Home\Transaction\Service\TransactionClassificationService;
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
        private Security                         $security,
    ) {}

    #[Route('/stats', name: 'api_transactions_stats', methods: ['GET'])]
    public function stats(Request $request): JsonResponse
    {
        $dateFrom = $request->query->get('dateFrom');
        $dateTo   = $request->query->get('dateTo');

        return $this->json($this->repository->getStats($dateFrom, $dateTo));
    }

    #[Route('', name: 'api_transactions_index', methods: ['GET'])]
    public function index(Request $request): JsonResponse
    {
        $q = $request->query;

        $filters = [
            'dateFrom'        => $q->get('dateFrom'),
            'dateTo'          => $q->get('dateTo'),
            'direction'       => $q->get('direction'),
            'status'          => $q->get('status'),
            'paidFromPartyId' => $q->get('paidFromPartyId'),
            'paidToPartyId'   => $q->get('paidToPartyId'),
            'walletId'        => $q->get('walletId'),
            'concernId'       => $q->get('concernId'),
            'categoryId'      => $q->get('categoryId'),
            'amountMin'       => $q->get('amountMin'),
            'amountMax'       => $q->get('amountMax'),
        ];

        $sortField = $q->get('sortField', 'date');
        $sortDir   = $q->get('sortDir', 'desc');
        $page      = max(1, (int) $q->get('page', 1));
        $perPage   = min(100, max(1, (int) $q->get('perPage', 25)));

        $result = $this->repository->findPaged($filters, $sortField, $sortDir, $page, $perPage);

        $total    = $result['total'];
        $lastPage = max(1, (int) ceil($total / $perPage));

        return $this->json([
            'data' => array_map(fn(Transaction $t) => $t->toApiArray(), $result['items']),
            'meta' => [
                'total'    => $total,
                'page'     => $page,
                'perPage'  => $perPage,
                'lastPage' => $lastPage,
            ],
        ]);
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
                $result = $this->classificationRuleApplyService->applyByFilters($filters, $user, $overwrite);
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

        /** @var User $user */
        $user = $this->security->getUser();

        try {
            $this->classificationService->classifyTransaction(
                $tx,
                $itemsPayload,
                $paidFromPartyId,
                $paidToPartyId,
                $user,
            );
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], 422);
        }

        return $this->json($tx->toApiArray());
    }
}
