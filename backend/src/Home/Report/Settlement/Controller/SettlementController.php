<?php

namespace App\Home\Report\Settlement\Controller;

use App\Home\Report\Settlement\DTO\SettlementQuery;
use App\Home\Report\Settlement\Service\SettlementConfigService;
use App\Home\Report\Settlement\Service\SettlementService;
use App\Identity\Entity\User;
use App\Shared\DTO\QueryValidationErrors;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/reports/settlements')]
class SettlementController extends AbstractController
{
    public function __construct(
        private SettlementService $settlementService,
        private SettlementConfigService $configService,
        private Security $security,
    ) {}

    #[Route('', name: 'api_reports_settlements', methods: ['GET'])]
    public function index(Request $request): JsonResponse
    {
        $query = SettlementQuery::fromInputBag($request->query);
        if ($query instanceof QueryValidationErrors) {
            return $this->json($query->toArray(), 422);
        }

        /** @var User $user */
        $user   = $this->security->getUser();
        $config = $this->configService->getForUser($user);

        if (!$config->isConfigured()) {
            return $this->json([
                'message' => 'Skonfiguruj rozliczenie i portfel budżetu domowego w zakładce Konfiguracja.',
                'config'  => $config->toApiArray(),
            ], 422);
        }

        try {
            $result = $this->settlementService->calculate($query, $config);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], 422);
        }

        return $this->json($result);
    }

    #[Route('/config', name: 'api_reports_settlements_config_get', methods: ['GET'])]
    public function configGet(): JsonResponse
    {
        /** @var User $user */
        $user   = $this->security->getUser();
        $config = $this->configService->getForUser($user);

        return $this->json($config->toApiArray());
    }

    #[Route('/config', name: 'api_reports_settlements_config_put', methods: ['PUT'])]
    public function configPut(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];

        /** @var User $user */
        $user = $this->security->getUser();

        try {
            $config = $this->configService->update($user, $data);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], 422);
        }

        return $this->json($config->toApiArray());
    }
}
