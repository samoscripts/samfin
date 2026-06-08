<?php

namespace App\Home\Configuration\Controller;

use App\Home\Configuration\Entity\Party;
use App\Home\Configuration\Repository\PartyRepository;
use App\Identity\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/parties')]
class PartyController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $em,
        private PartyRepository        $partyRepository,
        private Security               $security,
    ) {}

    #[Route('', name: 'api_parties_index', methods: ['GET'])]
    public function index(): JsonResponse
    {
        return $this->json(array_map(
            fn(Party $p) => $p->toApiArray(),
            $this->partyRepository->findBy([], ['name' => 'ASC'])
        ));
    }

    #[Route('/{id}', name: 'api_parties_show', methods: ['GET'])]
    public function show(int $id): JsonResponse
    {
        $party = $this->partyRepository->find($id);
        if (!$party) {
            return $this->json(['message' => 'Nie znaleziono podmiotu.'], 404);
        }
        return $this->json($party->toApiArray());
    }

    #[Route('', name: 'api_parties_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];

        $name = trim((string)($data['name'] ?? ''));
        if ($name === '') {
            return $this->json(['message' => 'Pole nazwa jest wymagane.'], 422);
        }

        $type = $data['type'] ?? Party::TYPE_OTHER;
        if (!in_array($type, Party::TYPES, true)) {
            return $this->json(['message' => 'Nieprawidłowy typ podmiotu.'], 422);
        }

        $ownershipType = $data['ownershipType'] ?? Party::OWNERSHIP_EXTERNAL;
        if (!in_array($ownershipType, Party::OWNERSHIPS, true)) {
            return $this->json(['message' => 'Nieprawidłowy typ własności.'], 422);
        }

        $usageType = $data['usageType'] ?? Party::USAGE_BOTH;
        if (!in_array($usageType, Party::USAGES, true)) {
            return $this->json(['message' => 'Nieprawidłowy typ użycia.'], 422);
        }

        /** @var User $user */
        $user = $this->security->getUser();

        $party = new Party();
        $party->setName($name);
        $party->setType($type);
        $party->setOwnershipType($ownershipType);
        $party->setUsageType($usageType);
        $party->setDescription(($data['description'] ?? '') !== '' ? $data['description'] : null);
        $party->setActive((bool)($data['active'] ?? true));
        $party->setCreatedBy($user);
        $party->setUpdatedBy($user);

        $this->em->persist($party);
        $this->em->flush();

        return $this->json($party->toApiArray(), 201);
    }

    #[Route('/{id}', name: 'api_parties_update', methods: ['PUT'])]
    public function update(int $id, Request $request): JsonResponse
    {
        $party = $this->partyRepository->find($id);
        if (!$party) {
            return $this->json(['message' => 'Nie znaleziono podmiotu.'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        if (array_key_exists('name', $data)) {
            $name = trim((string)$data['name']);
            if ($name === '') {
                return $this->json(['message' => 'Pole nazwa jest wymagane.'], 422);
            }
            $party->setName($name);
        }
        if (array_key_exists('type', $data)) {
            if (!in_array($data['type'], Party::TYPES, true)) {
                return $this->json(['message' => 'Nieprawidłowy typ podmiotu.'], 422);
            }
            $party->setType($data['type']);
        }
        if (array_key_exists('ownershipType', $data)) {
            if (!in_array($data['ownershipType'], Party::OWNERSHIPS, true)) {
                return $this->json(['message' => 'Nieprawidłowy typ własności.'], 422);
            }
            $party->setOwnershipType($data['ownershipType']);
        }
        if (array_key_exists('usageType', $data)) {
            if (!in_array($data['usageType'], Party::USAGES, true)) {
                return $this->json(['message' => 'Nieprawidłowy typ użycia.'], 422);
            }
            $party->setUsageType($data['usageType']);
        }
        if (array_key_exists('description', $data)) {
            $party->setDescription(($data['description'] ?? '') !== '' ? $data['description'] : null);
        }
        if (array_key_exists('active', $data)) {
            $party->setActive((bool)$data['active']);
        }

        /** @var User $user */
        $user = $this->security->getUser();
        $party->setUpdatedBy($user);

        $this->em->flush();
        return $this->json($party->toApiArray());
    }

    #[Route('/{id}', name: 'api_parties_delete', methods: ['DELETE'])]
    public function delete(int $id): JsonResponse
    {
        $party = $this->partyRepository->find($id);
        if (!$party) {
            return $this->json(['message' => 'Nie znaleziono podmiotu.'], 404);
        }

        /** @var User $user */
        $user = $this->security->getUser();
        $party->setActive(false);
        $party->setUpdatedBy($user);
        $this->em->flush();

        return $this->json(['message' => 'Podmiot dezaktywowany.']);
    }
}
