<?php

namespace App\Home\Report\Trend\Controller;

use App\Home\Report\Trend\DTO\TrendQuery;
use App\Home\Report\Trend\Service\TrendAggregationService;
use App\Shared\DTO\QueryValidationErrors;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/reports/trend')]
class TrendController extends AbstractController
{
    public function __construct(
        private TrendAggregationService $trendService,
    ) {}

    #[Route('', name: 'api_reports_trend', methods: ['GET'])]
    public function index(Request $request): JsonResponse
    {
        $query = TrendQuery::fromInputBag($request->query);
        if ($query instanceof QueryValidationErrors) {
            return $this->json($query->toArray(), 422);
        }

        return $this->json($this->trendService->build($query));
    }
}
