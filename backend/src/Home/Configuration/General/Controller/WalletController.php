<?php

namespace App\Home\Configuration\General\Controller;

use App\Home\Configuration\General\Entity\Wallet;
use App\Home\Configuration\General\Repository\WalletRepository;
use App\Identity\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/wallets')]
class WalletController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $em,
        private WalletRepository       $repository,
        private Security               $security,
    ) {}

    #[Route('', name: 'api_wallets_index', methods: ['GET'])]
    public function index(): JsonResponse
    {
        return $this->json(array_map(
            fn(Wallet $w) => $w->toApiArray(),
            $this->repository->findBy([], ['name' => 'ASC'])
        ));
    }

    #[Route('/{id}', name: 'api_wallets_show', methods: ['GET'])]
    public function show(int $id): JsonResponse
    {
        $wallet = $this->repository->find($id);
        return $wallet
            ? $this->json($wallet->toApiArray())
            : $this->json(['message' => 'Nie znaleziono portfela.'], 404);
    }

    #[Route('', name: 'api_wallets_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $name = trim((string)($data['name'] ?? ''));
        if ($name === '') {
            return $this->json(['message' => 'Pole nazwa jest wymagane.'], 422);
        }

        /** @var User $user */
        $user = $this->security->getUser();

        $wallet = new Wallet();
        $wallet->setName($name);
        $wallet->setDescription(($data['description'] ?? '') !== '' ? $data['description'] : null);
        $wallet->setActive((bool)($data['active'] ?? true));
        $wallet->setCreatedBy($user);
        $wallet->setUpdatedBy($user);

        $this->em->persist($wallet);
        $this->em->flush();

        return $this->json($wallet->toApiArray(), 201);
    }

    #[Route('/{id}', name: 'api_wallets_update', methods: ['PUT'])]
    public function update(int $id, Request $request): JsonResponse
    {
        $wallet = $this->repository->find($id);
        if (!$wallet) {
            return $this->json(['message' => 'Nie znaleziono portfela.'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        if (array_key_exists('name', $data)) {
            $name = trim((string)$data['name']);
            if ($name === '') {
                return $this->json(['message' => 'Pole nazwa jest wymagane.'], 422);
            }
            $wallet->setName($name);
        }
        if (array_key_exists('description', $data)) {
            $wallet->setDescription(($data['description'] ?? '') !== '' ? $data['description'] : null);
        }
        if (array_key_exists('active', $data)) {
            $wallet->setActive((bool)$data['active']);
        }

        /** @var User $user */
        $user = $this->security->getUser();
        $wallet->setUpdatedBy($user);

        $this->em->flush();
        return $this->json($wallet->toApiArray());
    }

    #[Route('/{id}', name: 'api_wallets_delete', methods: ['DELETE'])]
    public function delete(int $id): JsonResponse
    {
        $wallet = $this->repository->find($id);
        if (!$wallet) {
            return $this->json(['message' => 'Nie znaleziono portfela.'], 404);
        }

        /** @var User $user */
        $user = $this->security->getUser();
        $wallet->setActive(false);
        $wallet->setUpdatedBy($user);
        $this->em->flush();

        return $this->json(['message' => 'Portfel dezaktywowany.']);
    }
}
