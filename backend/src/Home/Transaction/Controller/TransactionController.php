<?php

namespace App\Home\Transaction\Controller;

use App\Home\Transaction\Entity\Transaction;
use App\Home\Transaction\Repository\TransactionRepository;
use App\Home\Transaction\Service\TransactionClassificationService;
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

    #[Route('/{id}', name: 'api_transactions_show', methods: ['GET'], requirements: ['id' => '\d+'])]
    public function show(int $id): JsonResponse
    {
        $tx = $this->repository->find($id);
        if (!$tx) {
            return $this->json(['message' => 'Nie znaleziono transakcji.'], 404);
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

        $itemsPayload    = $body['items']          ?? [];
        $paidFromPartyId = isset($body['paidFromPartyId']) ? (int) $body['paidFromPartyId'] : null;
        $paidToPartyId   = isset($body['paidToPartyId'])   ? (int) $body['paidToPartyId']   : null;

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
