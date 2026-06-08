<?php

namespace App\Home\Configuration\Controller;

use App\Home\Configuration\Entity\Category;
use App\Home\Configuration\Repository\CategoryRepository;
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

        $type = $data['type'] ?? Category::TYPE_EXPENSE;
        if (!in_array($type, Category::TYPES, true)) {
            return $this->json(['message' => 'Nieprawidłowy typ kategorii.'], 422);
        }

        $parent = null;
        if (array_key_exists('parentId', $data) && $data['parentId'] !== null && $data['parentId'] !== '') {
            $parentId = (int)$data['parentId'];
            $parent = $this->repository->find($parentId);
            if (!$parent) {
                return $this->json(['message' => 'Nie znaleziono kategorii nadrzędnej.'], 422);
            }
            if ($parent->getType() !== $type) {
                return $this->json(['message' => 'Kategoria i parent muszą mieć ten sam typ.'], 422);
            }
        }

        /** @var User $user */
        $user = $this->security->getUser();

        $category = new Category();
        $category->setName($name);
        $category->setType($type);
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
        $type   = $category->getType();
        $parent = $category->getParent();

        if (array_key_exists('name', $data)) {
            $name = trim((string)$data['name']);
            if ($name === '') {
                return $this->json(['message' => 'Pole nazwa jest wymagane.'], 422);
            }
            $category->setName($name);
        }
        if (array_key_exists('type', $data)) {
            if (!in_array($data['type'], Category::TYPES, true)) {
                return $this->json(['message' => 'Nieprawidłowy typ kategorii.'], 422);
            }
            $type = $data['type'];
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
        if ($parent && $parent->getType() !== $type) {
            return $this->json(['message' => 'Kategoria i parent muszą mieć ten sam typ.'], 422);
        }
        if (array_key_exists('description', $data)) {
            $category->setDescription(($data['description'] ?? '') !== '' ? $data['description'] : null);
        }
        if (array_key_exists('active', $data)) {
            $category->setActive((bool)$data['active']);
        }

        $category->setType($type);
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

        /** @var User $user */
        $user = $this->security->getUser();
        $category->setActive(false);
        $category->setUpdatedBy($user);
        $this->em->flush();

        return $this->json(['message' => 'Kategoria dezaktywowana.']);
    }
}
