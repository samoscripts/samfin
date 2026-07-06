<?php

namespace App\Home\Report\Settlement\Controller;

use App\Home\Report\Settlement\DTO\SettlementQuery;
use App\Home\Report\Settlement\Service\SettlementConfigService;
use App\Home\Report\Settlement\Service\SettlementIndexerService;
use App\Home\Report\Settlement\Service\SettlementPeriodService;
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
        private SettlementIndexerService $indexerService,
        private SettlementPeriodService $periodService,
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

        if ($config->getReindexFromDate() !== null) {
            $this->periodService->ensurePeriodsReady($user, $config);
        }

        try {
            $result = $this->settlementService->calculate($query, $config);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], 422);
        }

        return $this->json($result);
    }

    #[Route('/periods', name: 'api_reports_settlements_periods', methods: ['GET'])]
    public function periods(): JsonResponse
    {
        /** @var User $user */
        $user   = $this->security->getUser();
        $config = $this->configService->getForUser($user);

        if (!$config->isConfigured()) {
            return $this->json([
                'message' => 'Skonfiguruj rozliczenie i portfel budżetu domowego w zakładce Konfiguracja.',
            ], 422);
        }

        if ($config->getReindexFromDate() === null) {
            return $this->json([
                'message' => 'Ustaw datę startu ewidencji w konfiguracji rozliczenia.',
            ], 422);
        }

        return $this->json($this->periodService->listPeriods($user, $config));
    }

    #[Route('/refresh', name: 'api_reports_settlements_refresh', methods: ['POST'])]
    public function refresh(): JsonResponse
    {
        /** @var User $user */
        $user   = $this->security->getUser();
        $config = $this->configService->getForUser($user);

        if (!$config->isConfigured()) {
            return $this->json([
                'message' => 'Skonfiguruj rozliczenie przed odświeżeniem rozliczeń.',
            ], 422);
        }

        try {
            $this->periodService->assertRefreshAllowed($user, $config);
            $stats = $this->indexerService->rebuild($config);
        } catch (\RuntimeException $e) {
            return $this->json(['message' => $e->getMessage()], 409);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], 422);
        }

        return $this->json([
            'ok'     => true,
            'config' => $config->toApiArray(),
            ...$stats,
        ]);
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
