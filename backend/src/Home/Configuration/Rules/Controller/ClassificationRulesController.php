<?php

namespace App\Home\Configuration\Rules\Controller;

use App\Home\Configuration\Rules\Entity\ClassificationRule;
use App\Home\Configuration\Rules\Repository\ClassificationRuleRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/classification-rules')]
class ClassificationRulesController extends AbstractController
{
    public function __construct(
        private ClassificationRuleRepository $ruleRepository,
    ) {}

    #[Route('', name: 'api_classification_rules_all', methods: ['GET'])]
    public function index(): JsonResponse
    {
        return $this->json(array_map(
            fn (ClassificationRule $r) => $r->toApiArray(),
            $this->ruleRepository->findAllActive(),
        ));
    }
}
