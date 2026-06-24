<?php

namespace App\Home\Report\Analytics\Controller;

use App\Home\Report\Analytics\DTO\AnalyticsQuery;
use App\Home\Transaction\Repository\TransactionRepository;
use App\Shared\DTO\QueryValidationErrors;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/reports/analytics')]
class AnalyticsController extends AbstractController
{
    public function __construct(
        private TransactionRepository $transactionRepository,
    ) {}

    #[Route('', name: 'api_reports_analytics', methods: ['GET'])]
    public function index(Request $request): JsonResponse
    {
        $query = AnalyticsQuery::fromInputBag($request->query);
        if ($query instanceof QueryValidationErrors) {
            return $this->json($query->toArray(), 422);
        }
        $stats = $this->transactionRepository->getPeriodStats($query->toRepositoryFilters());

        return $this->json([
            'year'     => $query->year,
            'month'    => $query->month,
            'dateFrom' => $query->dateFrom(),
            'dateTo'   => $query->dateTo(),
            ...$stats,
        ]);
    }
}
