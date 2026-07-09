<?php

namespace App\Home\Configuration\General\Controller;

use App\Home\Configuration\General\Entity\Concern;
use App\Home\Configuration\General\Repository\ConcernRepository;
use App\Identity\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/concerns')]
class ConcernController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $em,
        private ConcernRepository      $repository,
        private Security               $security,
    ) {}

    #[Route('', name: 'api_concerns_index', methods: ['GET'])]
    public function index(): JsonResponse
    {
        return $this->json(array_map(
            fn(Concern $c) => $c->toApiArray(),
            $this->repository->findBy([], ['name' => 'ASC'])
        ));
    }

    #[Route('/{id}', name: 'api_concerns_show', methods: ['GET'])]
    public function show(int $id): JsonResponse
    {
        $concern = $this->repository->find($id);
        return $concern
            ? $this->json($concern->toApiArray())
            : $this->json(['message' => 'Nie znaleziono obszaru.'], 404);
    }

    #[Route('', name: 'api_concerns_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $name = trim((string)($data['name'] ?? ''));
        if ($name === '') {
            return $this->json(['message' => 'Pole nazwa jest wymagane.'], 422);
        }

        /** @var User $user */
        $user = $this->security->getUser();

        $concern = new Concern();
        $concern->setName($name);
        $concern->setDescription(($data['description'] ?? '') !== '' ? $data['description'] : null);
        $concern->setActive((bool)($data['active'] ?? true));
        $concern->setCreatedBy($user);
        $concern->setUpdatedBy($user);

        $this->em->persist($concern);
        $this->em->flush();

        return $this->json($concern->toApiArray(), 201);
    }

    #[Route('/{id}', name: 'api_concerns_update', methods: ['PUT'])]
    public function update(int $id, Request $request): JsonResponse
    {
        $concern = $this->repository->find($id);
        if (!$concern) {
            return $this->json(['message' => 'Nie znaleziono obszaru.'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        if (array_key_exists('name', $data)) {
            $name = trim((string)$data['name']);
            if ($name === '') {
                return $this->json(['message' => 'Pole nazwa jest wymagane.'], 422);
            }
            $concern->setName($name);
        }
        if (array_key_exists('description', $data)) {
            $concern->setDescription(($data['description'] ?? '') !== '' ? $data['description'] : null);
        }
        if (array_key_exists('active', $data)) {
            $concern->setActive((bool)$data['active']);
        }

        /** @var User $user */
        $user = $this->security->getUser();
        $concern->setUpdatedBy($user);

        $this->em->flush();
        return $this->json($concern->toApiArray());
    }

    #[Route('/{id}', name: 'api_concerns_delete', methods: ['DELETE'])]
    public function delete(int $id): JsonResponse
    {
        $concern = $this->repository->find($id);
        if (!$concern) {
            return $this->json(['message' => 'Nie znaleziono obszaru.'], 404);
        }

        /** @var User $user */
        $user = $this->security->getUser();
        $concern->setActive(false);
        $concern->setUpdatedBy($user);
        $this->em->flush();

        return $this->json(['message' => 'Obszar dezaktywowany.']);
    }
}
