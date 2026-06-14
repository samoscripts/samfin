<?php

namespace App\Settings\Controller;

use App\Home\Transaction\Service\TransactionMaintenanceService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/system')]
#[IsGranted('ROLE_ADMIN')]
class SystemController extends AbstractController
{
    public function __construct(
        private TransactionMaintenanceService $maintenanceService,
    ) {}

    #[Route('/transactions/export', name: 'api_system_transactions_export', methods: ['GET'])]
    public function exportTransactions(): StreamedResponse
    {
        $filename = 'transactions-' . (new \DateTimeImmutable())->format('Ymd-His') . '.json';

        $response = new StreamedResponse(function () {
            $this->maintenanceService->streamExportJson();
        });

        $response->headers->set('Content-Type', 'application/json; charset=utf-8');
        $response->headers->set('Content-Disposition', 'attachment; filename="' . $filename . '"');

        return $response;
    }

    #[Route('/transactions', name: 'api_system_transactions_clear', methods: ['DELETE'])]
    public function clearTransactions(): JsonResponse
    {
        $result = $this->maintenanceService->clearAll();

        return $this->json($result);
    }
}
