<?php

namespace App\Home\Import\Controller;

use App\Home\Import\Provider\BankImportProviderRegistry;
use App\Home\Import\Repository\CsvImportErrorRepository;
use App\Home\Import\Repository\CsvImportRepository;
use App\Home\Import\Repository\CsvImportRowRepository;
use App\Home\Import\DTO\ImportIngestionMode;
use App\Home\Import\Entity\CsvImport;
use App\Home\Import\Exception\CsvImportDuplicateRowException;
use App\Home\Import\Service\CsvImportService;
use App\Home\Transaction\ClassificationRule\Exception\ClassificationRuleApplicationException;
use App\Home\Transaction\Service\TransactionIngestionService;
use App\Identity\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/csv-imports')]
class CsvImportController extends AbstractController
{
    public function __construct(
        private CsvImportService            $importService,
        private TransactionIngestionService $ingestionService,
        private EntityManagerInterface      $em,
        private BankImportProviderRegistry  $providerRegistry,
        private CsvImportRepository         $importRepository,
        private CsvImportErrorRepository    $errorRepository,
        private CsvImportRowRepository      $rowRepository,
        private Security                    $security,
    ) {}

    #[Route('/providers', name: 'api_csv_imports_providers', methods: ['GET'])]
    public function providers(): JsonResponse
    {
        return $this->json($this->providerRegistry->listAll());
    }

    #[Route('', name: 'api_csv_imports_index', methods: ['GET'])]
    public function index(Request $request): JsonResponse
    {
        $page   = max(1, (int)$request->query->get('page', 1));
        $limit  = min(100, max(1, (int)$request->query->get('limit', 20)));
        $source = $request->query->get('source');
        $status = $request->query->get('status');

        $criteria = [];
        if ($source) $criteria['source'] = $source;
        if ($status) $criteria['status'] = $status;

        $total = $this->importRepository->count($criteria);
        $items = $this->importRepository->findBy(
            $criteria,
            ['createdAt' => 'DESC'],
            $limit,
            ($page - 1) * $limit,
        );

        return $this->json([
            'items' => array_map(fn($i) => $i->toApiArray(), $items),
            'total' => $total,
            'page'  => $page,
            'limit' => $limit,
            'pages' => (int)ceil($total / $limit),
        ]);
    }

    #[Route('/{id}', name: 'api_csv_imports_show', methods: ['GET'], requirements: ['id' => '\d+'])]
    public function show(int $id): JsonResponse
    {
        $import = $this->importRepository->find($id);
        if (!$import) {
            return $this->json(['message' => 'Nie znaleziono importu.'], 404);
        }
        return $this->json($import->toApiArray());
    }

    #[Route('/{id}/errors', name: 'api_csv_imports_errors', methods: ['GET'], requirements: ['id' => '\d+'])]
    public function errors(int $id, Request $request): JsonResponse
    {
        $import = $this->importRepository->find($id);
        if (!$import) {
            return $this->json(['message' => 'Nie znaleziono importu.'], 404);
        }

        $page  = max(1, (int)$request->query->get('page', 1));
        $limit = min(200, max(1, (int)$request->query->get('limit', 50)));
        $scope = $request->query->get('scope');

        $criteria = ['csvImport' => $import];
        if ($scope) $criteria['scope'] = $scope;

        $total = $this->errorRepository->count($criteria);
        $items = $this->errorRepository->findBy($criteria, ['id' => 'ASC'], $limit, ($page - 1) * $limit);

        return $this->json([
            'items' => array_map(fn($e) => $e->toApiArray(), $items),
            'total' => $total,
            'page'  => $page,
            'limit' => $limit,
            'pages' => (int)ceil($total / $limit),
        ]);
    }

    #[Route('/{id}/rows', name: 'api_csv_imports_rows', methods: ['GET'], requirements: ['id' => '\d+'])]
    public function rows(int $id, Request $request): JsonResponse
    {
        $import = $this->importRepository->find($id);
        if (!$import) {
            return $this->json(['message' => 'Nie znaleziono importu.'], 404);
        }

        $page        = max(1, (int)$request->query->get('page', 1));
        $limit       = min(200, max(1, (int)$request->query->get('limit', 100)));
        $parseStatus = $request->query->get('parseStatus');

        $criteria = ['csvImport' => $import];
        if ($parseStatus) $criteria['parseStatus'] = $parseStatus;

        $total = $this->rowRepository->count($criteria);
        $items = $this->rowRepository->findBy($criteria, ['lineNo' => 'ASC'], $limit, ($page - 1) * $limit);

        return $this->json([
            'items' => array_map(fn($r) => $r->toApiArray(), $items),
            'total' => $total,
            'page'  => $page,
            'limit' => $limit,
            'pages' => (int)ceil($total / $limit),
        ]);
    }

    #[Route('/{id}', name: 'api_csv_imports_delete', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    public function delete(int $id): JsonResponse
    {
        $import = $this->importRepository->find($id);
        if (!$import) {
            return $this->json(['message' => 'Nie znaleziono importu.'], 404);
        }

        if ($import->getStatus() === \App\Home\Import\Entity\CsvImport::STATUS_IMPORTED) {
            return $this->json([
                'message' => 'Nie można usunąć importu, który został przeniesiony do transakcji.',
            ], 409);
        }

        $this->em->remove($import);
        $this->em->flush();

        return $this->json(null, 204);
    }

    #[Route('/{id}/import', name: 'api_csv_imports_trigger_import', methods: ['POST'], requirements: ['id' => '\d+'])]
    public function triggerImport(int $id, Request $request): JsonResponse
    {
        $import = $this->importRepository->find($id);
        if (!$import) {
            return $this->json(['message' => 'Nie znaleziono importu.'], 404);
        }

        $payload = json_decode($request->getContent(), true);
        $mode    = ImportIngestionMode::tryFrom(is_array($payload) ? (string) ($payload['mode'] ?? '') : '')
            ?? ImportIngestionMode::Strict;

        $allowedStatuses = [CsvImport::STATUS_VALIDATED];
        if ($mode !== ImportIngestionMode::Strict) {
            $allowedStatuses[] = CsvImport::STATUS_IMPORTED;
        }

        if (!in_array($import->getStatus(), $allowedStatuses, true)) {
            return $this->json([
                'message' => 'Import w tym statusie nie może być przeniesiony do transakcji.',
                'status'  => $import->getStatus(),
            ], 409);
        }

        /** @var User $user */
        $user = $this->security->getUser();

        try {
            $stats = $this->ingestionService->ingestFromImport($import, $user, $mode);
        } catch (ClassificationRuleApplicationException $e) {
            return $this->json([
                'message' => $e->getMessage(),
                'context' => $e->getContext(),
            ], 400);
        } catch (CsvImportDuplicateRowException $e) {
            return $this->json([
                'message' => $e->getMessage(),
                'context' => $e->getContext(),
            ], 400);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], 400);
        }

        return $this->json([
            'import' => $import->toApiArray(),
            'stats'  => $stats->toApiArray(),
        ]);
    }

    #[Route('', name: 'api_csv_imports_upload', methods: ['POST'])]
    public function upload(Request $request): JsonResponse
    {
        $source = (string)($request->request->get('source', ''));
        if ($source === '') {
            return $this->json(['message' => 'Pole source jest wymagane.'], 422);
        }

        if (!$this->providerRegistry->has($source)) {
            return $this->json(['message' => "Nieznany provider: {$source}"], 422);
        }

        $file = $request->files->get('file');
        if ($file === null) {
            return $this->json(['message' => 'Plik CSV jest wymagany.'], 422);
        }

        $filePath = $file->getRealPath();
        if ($filePath === false || !is_readable($filePath)) {
            return $this->json(['message' => 'Nie udało się odczytać pliku CSV.'], 422);
        }

        $fileSize = filesize($filePath);
        if ($fileSize === false || $fileSize === 0) {
            return $this->json(['message' => 'Plik CSV jest pusty lub nieczytelny.'], 422);
        }

        /** @var User $user */
        $user = $this->security->getUser();

        $csvImport = $this->importService->import(
            source: $source,
            filePath: $filePath,
            originalFilename: $file->getClientOriginalName(),
            user: $user,
        );

        $errors = [];
        if ($csvImport->getErrorSummary() !== null) {
            foreach (explode("\n", $csvImport->getErrorSummary()) as $line) {
                if (trim($line) !== '') {
                    $errors[] = $line;
                }
            }
        }

        return $this->json([
            'import' => $csvImport->toApiArray(),
            'errors' => $errors,
        ], $csvImport->getStatus() === 'FAILED' ? 422 : 201);
    }
}
