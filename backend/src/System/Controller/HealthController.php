<?php

namespace App\System\Controller;

use App\System\Service\AppInfoProvider;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api')]
class HealthController extends AbstractController
{
    public function __construct(
        private readonly AppInfoProvider $appInfoProvider,
    ) {}

    #[Route('/health', name: 'api_health', methods: ['GET'])]
    public function health(): JsonResponse
    {
        return $this->json($this->appInfoProvider->getInfo());
    }
}
