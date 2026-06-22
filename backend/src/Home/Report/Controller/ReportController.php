<?php

namespace App\Home\Report\Controller;

use App\Home\Report\DTO\MonthlyReportQuery;
use App\Home\Transaction\Repository\TransactionRepository;
use App\Shared\DTO\QueryValidationErrors;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/reports')]
class ReportController extends AbstractController
{
    public function __construct(
        private TransactionRepository $transactionRepository,
    ) {}

    #[Route('/monthly', name: 'api_reports_monthly', methods: ['GET'])]
    public function monthly(Request $request): JsonResponse
    {
        $query = MonthlyReportQuery::fromInputBag($request->query);
        if ($query instanceof QueryValidationErrors) {
            return $this->json($query->toArray(), 422);
        }
        $stats = $this->transactionRepository->getPeriodStats($query->toRepositoryFilters());

        return $this->json([
            'year'    => $query->year,
            'month'   => $query->month,
            'dateFrom' => $query->dateFrom(),
            'dateTo'   => $query->dateTo(),
            ...$stats,
        ]);
    }
}
