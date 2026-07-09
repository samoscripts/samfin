<?php

namespace App\Home\Report\Breakdown\Controller;

use App\Home\Report\Breakdown\DTO\BreakdownQuery;
use App\Home\Report\Breakdown\Service\BreakdownService;
use App\Shared\DTO\QueryValidationErrors;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/reports/breakdown')]
class BreakdownController extends AbstractController
{
    public function __construct(
        private BreakdownService $breakdownService,
    ) {}

    #[Route('', name: 'api_reports_breakdown', methods: ['GET'])]
    public function index(Request $request): JsonResponse
    {
        $query = BreakdownQuery::fromInputBag($request->query);
        if ($query instanceof QueryValidationErrors) {
            return $this->json($query->toArray(), 422);
        }

        return $this->json(
            $this->breakdownService->build($query),
            context: ['json_encode_options' => \JSON_PRESERVE_ZERO_FRACTION],
        );
    }
}
