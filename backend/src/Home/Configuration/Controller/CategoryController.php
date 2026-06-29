<?php

namespace App\Home\Configuration\Controller;

use App\Home\Configuration\Entity\Category;
use App\Home\Configuration\Exception\CategoryInUseException;
use App\Home\Configuration\Repository\CategoryRepository;
use App\Home\Configuration\Service\CategoryMergeService;
use App\Home\Configuration\Service\CategoryUsageService;
use App\Identity\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/categories')]
class CategoryController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $em,
        private CategoryRepository     $repository,
        private CategoryMergeService   $mergeService,
        private CategoryUsageService   $usageService,
        private Security               $security,
    ) {}

    #[Route('', name: 'api_categories_index', methods: ['GET'])]
    public function index(): JsonResponse
    {
        return $this->json(array_map(
            fn(Category $c) => $c->toApiArray(),
            $this->repository->findBy([], ['name' => 'ASC'])
        ));
    }

    #[Route('/merge', name: 'api_categories_merge', methods: ['POST'])]
    public function merge(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $sourceId = isset($data['sourceId']) ? (int) $data['sourceId'] : 0;
        $targetId = isset($data['targetId']) ? (int) $data['targetId'] : 0;

        if ($sourceId < 1 || $targetId < 1) {
            return $this->json(['message' => 'Pola sourceId i targetId są wymagane.'], 422);
        }

        $source = $this->repository->find($sourceId);
        $target = $this->repository->find($targetId);

        if (!$source instanceof Category) {
            return $this->json(['message' => 'Nie znaleziono kategorii źródłowej.'], 404);
        }
        if (!$target instanceof Category) {
            return $this->json(['message' => 'Nie znaleziono kategorii docelowej.'], 404);
        }

        /** @var User $user */
        $user = $this->security->getUser();

        try {
            $result = $this->mergeService->mergeSubcategories($source, $target, $user);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], 422);
        }

        return $this->json($result);
    }

    #[Route('/{id}', name: 'api_categories_show', methods: ['GET'])]
    public function show(int $id): JsonResponse
    {
        $category = $this->repository->find($id);
        return $category
            ? $this->json($category->toApiArray())
            : $this->json(['message' => 'Nie znaleziono kategorii.'], 404);
    }

    #[Route('', name: 'api_categories_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $name = trim((string)($data['name'] ?? ''));
        if ($name === '') {
            return $this->json(['message' => 'Pole nazwa jest wymagane.'], 422);
        }

        $parent = null;
        if (array_key_exists('parentId', $data) && $data['parentId'] !== null && $data['parentId'] !== '') {
            $parentId = (int)$data['parentId'];
            $parent = $this->repository->find($parentId);
            if (!$parent) {
                return $this->json(['message' => 'Nie znaleziono kategorii nadrzędnej.'], 422);
            }
            $parentError = $this->validateParentAssignment($parent);
            if ($parentError !== null) {
                return $this->json(['message' => $parentError], 422);
            }
        }

        /** @var User $user */
        $user = $this->security->getUser();

        $category = new Category();
        $category->setName($name);
        $category->setParent($parent);
        $category->setDescription(($data['description'] ?? '') !== '' ? $data['description'] : null);
        $category->setActive((bool)($data['active'] ?? true));
        $category->setCreatedBy($user);
        $category->setUpdatedBy($user);

        $this->em->persist($category);
        $this->em->flush();

        return $this->json($category->toApiArray(), 201);
    }

    #[Route('/{id}', name: 'api_categories_update', methods: ['PUT'])]
    public function update(int $id, Request $request): JsonResponse
    {
        $category = $this->repository->find($id);
        if (!$category) {
            return $this->json(['message' => 'Nie znaleziono kategorii.'], 404);
        }

        $data   = json_decode($request->getContent(), true) ?? [];
        $parent = $category->getParent();

        if (array_key_exists('name', $data)) {
            $name = trim((string)$data['name']);
            if ($name === '') {
                return $this->json(['message' => 'Pole nazwa jest wymagane.'], 422);
            }
            $category->setName($name);
        }
        if (array_key_exists('parentId', $data)) {
            if ($data['parentId'] === null || $data['parentId'] === '') {
                $parent = null;
            } else {
                $parentId = (int)$data['parentId'];
                if ($parentId === $category->getId()) {
                    return $this->json(['message' => 'Kategoria nie może być swoim parentem.'], 422);
                }
                $parent = $this->repository->find($parentId);
                if (!$parent) {
                    return $this->json(['message' => 'Nie znaleziono kategorii nadrzędnej.'], 422);
                }
            }
        }

        if ($parent !== null) {
            $parentError = $this->validateParentAssignment($parent);
            if ($parentError !== null) {
                return $this->json(['message' => $parentError], 422);
            }
        }

        if ($parent !== null && $category->getParent()?->getId() !== $parent->getId()) {
            $moveError = $this->validateCanBecomeChild($category);
            if ($moveError !== null) {
                return $this->json(['message' => $moveError], 422);
            }
        }

        if (array_key_exists('description', $data)) {
            $category->setDescription(($data['description'] ?? '') !== '' ? $data['description'] : null);
        }
        if (array_key_exists('active', $data)) {
            $nextActive = (bool) $data['active'];
            if ($category->isActive() && !$nextActive) {
                $blocked = $this->deactivationBlockedResponse($category);
                if ($blocked !== null) {
                    return $blocked;
                }
            }
            $category->setActive($nextActive);
        }

        $category->setParent($parent);

        /** @var User $user */
        $user = $this->security->getUser();
        $category->setUpdatedBy($user);

        $this->em->flush();
        return $this->json($category->toApiArray());
    }

    #[Route('/{id}', name: 'api_categories_delete', methods: ['DELETE'])]
    public function delete(int $id): JsonResponse
    {
        $category = $this->repository->find($id);
        if (!$category) {
            return $this->json(['message' => 'Nie znaleziono kategorii.'], 404);
        }

        if (!$category->isActive()) {
            return $this->permanentDelete($category);
        }

        $blocked = $this->deactivationBlockedResponse($category);
        if ($blocked !== null) {
            return $blocked;
        }

        /** @var User $user */
        $user = $this->security->getUser();
        $category->setActive(false);
        $category->setUpdatedBy($user);
        $this->em->flush();

        return $this->json(['message' => 'Kategoria dezaktywowana.']);
    }

    private function permanentDelete(Category $category): JsonResponse
    {
        $categoryId = $category->getId();
        if ($categoryId === null) {
            return $this->json(['message' => 'Nie znaleziono kategorii.'], 404);
        }

        if ($this->repository->countChildren($categoryId) > 0) {
            return $this->json(['message' => 'Usuń najpierw subkategorie tej grupy.'], 422);
        }

        $blocked = $this->usageBlockedResponse(
            $categoryId,
            'Nie można usunąć kategorii z bazy, ponieważ jest używana.',
        );
        if ($blocked !== null) {
            return $blocked;
        }

        $this->em->remove($category);
        $this->em->flush();

        return $this->json(['message' => 'Kategoria usunięta.']);
    }

    private function deactivationBlockedResponse(Category $category): ?JsonResponse
    {
        $categoryId = $category->getId();
        if ($categoryId === null) {
            return null;
        }

        return $this->usageBlockedResponse($categoryId);
    }

    private function usageBlockedResponse(int $categoryId, ?string $message = null): ?JsonResponse
    {
        try {
            $this->assertCategoryHasNoUsages($categoryId, $message);
        } catch (CategoryInUseException $e) {
            return $this->json([
                'message' => $e->getMessage(),
                'usage'   => $e->getUsage(),
            ], 422);
        }

        return null;
    }

    private function assertCategoryHasNoUsages(int $categoryId, ?string $message = null): void
    {
        $usage = $this->usageService->countUsages($categoryId);
        if ($usage['total'] > 0) {
            throw new CategoryInUseException($usage, $message ?? 'Nie można dezaktywować kategorii, ponieważ jest używana.');
        }
    }

    private function validateParentAssignment(Category $parent): ?string
    {
        if ($parent->getParent() !== null) {
            return 'Kategoria nadrzędna musi być grupą główną.';
        }

        return null;
    }

    private function validateCanBecomeChild(Category $category): ?string
    {
        if ($category->getParent() === null && $this->repository->countChildren((int) $category->getId()) > 0) {
            return 'Grupa z subkategoriami nie może być przeniesiona pod inną grupę.';
        }

        return null;
    }

}
