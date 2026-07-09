<?php

namespace App\Home\Configuration\General\Controller;

use App\Home\Configuration\General\Service\CategoryPickEventService;
use App\Home\Transaction\Entity\Transaction;
use App\Identity\Entity\User;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/category-pick-events')]
class CategoryPickEventController extends AbstractController
{
    public function __construct(
        private CategoryPickEventService $service,
        private Security $security,
    ) {}

    #[Route('/frequent', name: 'api_category_pick_events_frequent', methods: ['GET'])]
    public function frequent(Request $request): JsonResponse
    {
        $direction = (string) $request->query->get('direction', '');
        if (!$this->isValidDirection($direction)) {
            return $this->json([
                'message' => 'Parametr direction jest wymagany i musi być INCOME lub EXPENSE.',
            ], 422);
        }

        $limit = (int) $request->query->get('limit', CategoryPickEventService::MAX_FREQUENT_LIMIT);
        if ($limit < 1) {
            $limit = CategoryPickEventService::MAX_FREQUENT_LIMIT;
        }

        /** @var User $user */
        $user = $this->security->getUser();

        return $this->json($this->service->findFrequent($user, $direction, $limit));
    }

    #[Route('', name: 'api_category_pick_events_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];

        $direction = (string) ($data['direction'] ?? '');
        if (!$this->isValidDirection($direction)) {
            return $this->json([
                'message' => 'Pole direction jest wymagane i musi być INCOME lub EXPENSE.',
            ], 422);
        }

        $categoryId = isset($data['categoryId']) ? (int) $data['categoryId'] : 0;
        if ($categoryId <= 0) {
            return $this->json(['message' => 'Pole categoryId jest wymagane.'], 422);
        }

        $category = $this->service->resolveCategory($categoryId);
        if ($category === null) {
            return $this->json(['message' => 'Nie znaleziono kategorii.'], 404);
        }

        /** @var User $user */
        $user = $this->security->getUser();

        try {
            $this->service->recordPick($user, $category, $direction);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], 422);
        }

        return $this->json(null, 204);
    }

    private function isValidDirection(string $direction): bool
    {
        return in_array($direction, [Transaction::DIRECTION_EXPENSE, Transaction::DIRECTION_INCOME], true);
    }
}
