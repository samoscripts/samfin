<?php

namespace App\Home\Transaction\FilterSaved\Controller;

use App\Home\Transaction\FilterSaved\DTO\TransactionFilterSavedParams;
use App\Home\Transaction\FilterSaved\Entity\TransactionFilterSaved;
use App\Home\Transaction\FilterSaved\Repository\TransactionFilterSavedRepository;
use App\Identity\Entity\User;
use App\Shared\DTO\QueryValidationErrors;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/transaction-filter-saved')]
class TransactionFilterSavedController extends AbstractController
{
    private const NAME_MAX_LENGTH = 200;
    private const DESCRIPTION_MAX_LENGTH = 2000;

    public function __construct(
        private EntityManagerInterface $em,
        private TransactionFilterSavedRepository $repository,
        private Security $security,
    ) {}

    #[Route('', name: 'api_transaction_filter_saved_index', methods: ['GET'])]
    public function index(): JsonResponse
    {
        /** @var User $user */
        $user = $this->security->getUser();

        return $this->json(array_map(
            static fn (TransactionFilterSaved $f) => $f->toApiArray(),
            $this->repository->findByUser($user),
        ));
    }

    #[Route('', name: 'api_transaction_filter_saved_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];

        $nameResult = $this->parseName($data['name'] ?? null);
        if ($nameResult instanceof JsonResponse) {
            return $nameResult;
        }

        $descriptionResult = $this->parseDescription($data['description'] ?? null);
        if ($descriptionResult instanceof JsonResponse) {
            return $descriptionResult;
        }

        if (!isset($data['params']) || !is_array($data['params'])) {
            return $this->json(['message' => 'Pole params jest wymagane.'], 422);
        }

        $paramsResult = TransactionFilterSavedParams::fromArray($data['params']);
        if ($paramsResult instanceof QueryValidationErrors) {
            return $this->json(['message' => 'Nieprawidłowe parametry filtra.', 'errors' => $paramsResult->fields], 422);
        }

        /** @var User $user */
        $user = $this->security->getUser();

        if ($this->repository->findOneByUserAndName($user, $nameResult) !== null) {
            return $this->json(['message' => 'Filtr o tej nazwie już istnieje.'], 422);
        }

        $filter = new TransactionFilterSaved();
        $filter->setUser($user);
        $filter->setName($nameResult);
        $filter->setDescription($descriptionResult);
        $filter->setParamsJson($paramsResult->toStorageArray());

        $this->em->persist($filter);
        $this->em->flush();

        return $this->json($filter->toApiArray(), 201);
    }

    #[Route('/{id}', name: 'api_transaction_filter_saved_update', methods: ['PUT'])]
    public function update(int $id, Request $request): JsonResponse
    {
        $filter = $this->findOwned($id);
        if ($filter instanceof JsonResponse) {
            return $filter;
        }

        $data = json_decode($request->getContent(), true) ?? [];

        if (array_key_exists('name', $data)) {
            $nameResult = $this->parseName($data['name']);
            if ($nameResult instanceof JsonResponse) {
                return $nameResult;
            }

            /** @var User $user */
            $user = $this->security->getUser();
            $existing = $this->repository->findOneByUserAndName($user, $nameResult);
            if ($existing !== null && $existing->getId() !== $filter->getId()) {
                return $this->json(['message' => 'Filtr o tej nazwie już istnieje.'], 422);
            }

            $filter->setName($nameResult);
        }

        if (array_key_exists('description', $data)) {
            $descriptionResult = $this->parseDescription($data['description']);
            if ($descriptionResult instanceof JsonResponse) {
                return $descriptionResult;
            }
            $filter->setDescription($descriptionResult);
        }

        if (array_key_exists('params', $data)) {
            if (!is_array($data['params'])) {
                return $this->json(['message' => 'Pole params musi być obiektem.'], 422);
            }

            $paramsResult = TransactionFilterSavedParams::fromArray($data['params']);
            if ($paramsResult instanceof QueryValidationErrors) {
                return $this->json(['message' => 'Nieprawidłowe parametry filtra.', 'errors' => $paramsResult->fields], 422);
            }

            $filter->setParamsJson($paramsResult->toStorageArray());
        }

        $this->em->flush();

        return $this->json($filter->toApiArray());
    }

    #[Route('/{id}', name: 'api_transaction_filter_saved_delete', methods: ['DELETE'])]
    public function delete(int $id): JsonResponse
    {
        $filter = $this->findOwned($id);
        if ($filter instanceof JsonResponse) {
            return $filter;
        }

        $this->em->remove($filter);
        $this->em->flush();

        return $this->json(null, 204);
    }

    private function findOwned(int $id): TransactionFilterSaved|JsonResponse
    {
        $filter = $this->repository->find($id);
        if (!$filter instanceof TransactionFilterSaved) {
            return $this->json(['message' => 'Nie znaleziono filtra.'], 404);
        }

        /** @var User $user */
        $user = $this->security->getUser();
        if ($filter->getUser()?->getId() !== $user->getId()) {
            return $this->json(['message' => 'Nie znaleziono filtra.'], 404);
        }

        return $filter;
    }

    private function parseName(mixed $raw): string|JsonResponse
    {
        if (!is_string($raw)) {
            return $this->json(['message' => 'Pole nazwa jest wymagane.'], 422);
        }

        $name = trim($raw);
        if ($name === '') {
            return $this->json(['message' => 'Pole nazwa jest wymagane.'], 422);
        }

        if (mb_strlen($name) > self::NAME_MAX_LENGTH) {
            return $this->json(['message' => sprintf('Nazwa może mieć maksymalnie %d znaków.', self::NAME_MAX_LENGTH)], 422);
        }

        return $name;
    }

    private function parseDescription(mixed $raw): string|null|JsonResponse
    {
        if ($raw === null) {
            return null;
        }

        if (!is_string($raw)) {
            return $this->json(['message' => 'Pole opis musi być tekstem.'], 422);
        }

        $description = trim($raw);
        if ($description === '') {
            return null;
        }

        if (mb_strlen($description) > self::DESCRIPTION_MAX_LENGTH) {
            return $this->json(['message' => sprintf('Opis może mieć maksymalnie %d znaków.', self::DESCRIPTION_MAX_LENGTH)], 422);
        }

        return $description;
    }
}
