<?php

namespace App\Home\Report\ReportSaved\Controller;

use App\Home\Report\ReportSaved\Entity\ReportSaved;
use App\Home\Report\ReportSaved\Repository\ReportSavedRepository;
use App\Identity\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/report-saved')]
class ReportSavedController extends AbstractController
{
    private const NAME_MAX_LENGTH = 200;
    private const DESCRIPTION_MAX_LENGTH = 2000;

    public function __construct(
        private EntityManagerInterface $em,
        private ReportSavedRepository $repository,
        private Security $security,
    ) {}

    #[Route('', name: 'api_report_saved_index', methods: ['GET'])]
    public function index(Request $request): JsonResponse
    {
        $type = (string) $request->query->get('type', '');
        if (!$this->isValidType($type)) {
            return $this->json(['message' => 'Parametr type jest wymagany i musi być trend lub breakdown.'], 422);
        }

        /** @var User $user */
        $user = $this->security->getUser();

        return $this->json(array_map(
            static fn (ReportSaved $r) => $r->toApiArray(),
            $this->repository->findByUserAndType($user, $type),
        ));
    }

    #[Route('', name: 'api_report_saved_create', methods: ['POST'])]
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

        $type = (string) ($data['type'] ?? '');
        if (!$this->isValidType($type)) {
            return $this->json(['message' => 'Pole type jest wymagane i musi być trend lub breakdown.'], 422);
        }

        if (!isset($data['params']) || !is_array($data['params'])) {
            return $this->json(['message' => 'Pole params jest wymagane.'], 422);
        }

        /** @var User $user */
        $user = $this->security->getUser();

        if ($this->repository->findOneByUserTypeAndName($user, $type, $nameResult) !== null) {
            return $this->json(['message' => 'Raport o tej nazwie już istnieje dla tego typu.'], 422);
        }

        $report = new ReportSaved();
        $report->setUser($user);
        $report->setType($type);
        $report->setName($nameResult);
        $report->setDescription($descriptionResult);
        $report->setParamsJson($data['params']);

        $this->em->persist($report);
        $this->em->flush();

        return $this->json($report->toApiArray(), 201);
    }

    #[Route('/{id}', name: 'api_report_saved_update', methods: ['PUT'])]
    public function update(int $id, Request $request): JsonResponse
    {
        $report = $this->findOwned($id);
        if ($report instanceof JsonResponse) {
            return $report;
        }

        $data = json_decode($request->getContent(), true) ?? [];

        if (array_key_exists('name', $data)) {
            $nameResult = $this->parseName($data['name']);
            if ($nameResult instanceof JsonResponse) {
                return $nameResult;
            }

            /** @var User $user */
            $user = $this->security->getUser();
            $existing = $this->repository->findOneByUserTypeAndName($user, $report->getType(), $nameResult);
            if ($existing !== null && $existing->getId() !== $report->getId()) {
                return $this->json(['message' => 'Raport o tej nazwie już istnieje dla tego typu.'], 422);
            }

            $report->setName($nameResult);
        }

        if (array_key_exists('description', $data)) {
            $descriptionResult = $this->parseDescription($data['description']);
            if ($descriptionResult instanceof JsonResponse) {
                return $descriptionResult;
            }
            $report->setDescription($descriptionResult);
        }

        if (array_key_exists('params', $data)) {
            if (!is_array($data['params'])) {
                return $this->json(['message' => 'Pole params musi być obiektem.'], 422);
            }
            $report->setParamsJson($data['params']);
        }

        $this->em->flush();

        return $this->json($report->toApiArray());
    }

    #[Route('/{id}', name: 'api_report_saved_delete', methods: ['DELETE'])]
    public function delete(int $id): JsonResponse
    {
        $report = $this->findOwned($id);
        if ($report instanceof JsonResponse) {
            return $report;
        }

        $this->em->remove($report);
        $this->em->flush();

        return $this->json(null, 204);
    }

    private function findOwned(int $id): ReportSaved|JsonResponse
    {
        $report = $this->repository->find($id);
        if (!$report instanceof ReportSaved) {
            return $this->json(['message' => 'Nie znaleziono raportu.'], 404);
        }

        /** @var User $user */
        $user = $this->security->getUser();
        if ($report->getUser()?->getId() !== $user->getId()) {
            return $this->json(['message' => 'Nie znaleziono raportu.'], 404);
        }

        return $report;
    }

    private function isValidType(string $type): bool
    {
        return in_array($type, ReportSaved::TYPES, true);
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
