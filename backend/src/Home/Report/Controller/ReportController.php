<?php

namespace App\Home\Report\Controller;

use App\Home\Report\DTO\CommonAccountSettlementQuery;
use App\Home\Report\DTO\MonthlyReportQuery;
use App\Home\Report\Service\CommonAccountSettlementConfigService;
use App\Home\Report\Service\CommonAccountSettlementService;
use App\Home\Transaction\Repository\TransactionRepository;
use App\Identity\Entity\User;
use App\Shared\DTO\QueryValidationErrors;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/reports')]
class ReportController extends AbstractController
{
    public function __construct(
        private TransactionRepository $transactionRepository,
        private CommonAccountSettlementService $settlementService,
        private CommonAccountSettlementConfigService $configService,
        private Security $security,
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

    #[Route('/common-account-settlement', name: 'api_reports_common_account_settlement', methods: ['GET'])]
    public function commonAccountSettlement(Request $request): JsonResponse
    {
        $query = CommonAccountSettlementQuery::fromInputBag($request->query);
        if ($query instanceof QueryValidationErrors) {
            return $this->json($query->toArray(), 422);
        }

        /** @var User $user */
        $user   = $this->security->getUser();
        $config = $this->configService->getForUser($user);

        if (!$config->isConfigured()) {
            return $this->json([
                'message' => 'Skonfiguruj konto wspólne i portfel budżetu domowego w zakładce Konfiguracja.',
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

    #[Route('/common-account-settlement/config', name: 'api_reports_common_account_settlement_config_get', methods: ['GET'])]
    public function commonAccountSettlementConfigGet(): JsonResponse
    {
        /** @var User $user */
        $user   = $this->security->getUser();
        $config = $this->configService->getForUser($user);

        return $this->json($config->toApiArray());
    }

    #[Route('/common-account-settlement/config', name: 'api_reports_common_account_settlement_config_put', methods: ['PUT'])]
    public function commonAccountSettlementConfigPut(Request $request): JsonResponse
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
