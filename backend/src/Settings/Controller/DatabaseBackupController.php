<?php

namespace App\Settings\Controller;

use App\Settings\Exception\DatabaseBackupException;
use App\Settings\Service\DatabaseBackupService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/system/backups')]
#[IsGranted('ROLE_ADMIN')]
class DatabaseBackupController extends AbstractController
{
    public function __construct(
        private readonly DatabaseBackupService $backupService,
    ) {}

    #[Route('', name: 'api_system_backups_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        return $this->json($this->backupService->listBackups());
    }

    #[Route('', name: 'api_system_backups_create', methods: ['POST'])]
    public function create(): JsonResponse
    {
        set_time_limit(0);

        try {
            return $this->json($this->backupService->createBackup(), Response::HTTP_CREATED);
        } catch (DatabaseBackupException $e) {
            return $this->backupError($e);
        }
    }

    #[Route('/restore', name: 'api_system_backups_restore_upload', methods: ['POST'])]
    public function restoreUpload(Request $request): JsonResponse
    {
        set_time_limit(0);

        $confirm = (string) $request->request->get('confirm', '');
        if ($confirm !== 'PRZYWRÓĆ' && $confirm !== 'PRZYWRÓĆ MIMO NIEZGODNOŚCI') {
            return $this->json(['message' => 'Wpisz PRZYWRÓĆ w polu potwierdzenia.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $force = $confirm === 'PRZYWRÓĆ MIMO NIEZGODNOŚCI'
            || filter_var($request->request->get('force', false), FILTER_VALIDATE_BOOL);

        $file = $request->files->get('file');
        if ($file === null || !$file->isValid()) {
            return $this->json(['message' => 'Prześlij prawidłowy plik ZIP.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if ($file->getSize() > $this->backupService->getMaxUploadBytes()) {
            return $this->json([
                'message' => 'Plik jest za duży dla uploadu HTTP. Użyj CLI: app:database:restore.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if (strtolower($file->getClientOriginalExtension()) !== 'zip') {
            return $this->json(['message' => 'Dozwolony jest tylko format ZIP.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        try {
            return $this->json($this->backupService->restoreFromUploadedFile($file->getPathname(), $force));
        } catch (DatabaseBackupException $e) {
            return $this->backupError($e);
        }
    }

    #[Route('/{id}/restore', name: 'api_system_backups_restore_id', methods: ['POST'])]
    public function restoreFromServer(string $id, Request $request): JsonResponse
    {
        set_time_limit(0);

        $confirm = (string) $request->request->get('confirm', '');
        if ($confirm !== 'PRZYWRÓĆ' && $confirm !== 'PRZYWRÓĆ MIMO NIEZGODNOŚCI') {
            return $this->json(['message' => 'Wpisz PRZYWRÓĆ w polu potwierdzenia.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $force = $confirm === 'PRZYWRÓĆ MIMO NIEZGODNOŚCI'
            || filter_var($request->request->get('force', false), FILTER_VALIDATE_BOOL);

        try {
            $zipPath = $this->backupService->getDownloadPath($id);

            return $this->json($this->backupService->restoreFromLocalZip($zipPath, $force));
        } catch (DatabaseBackupException $e) {
            return $this->backupError($e);
        }
    }

    #[Route('/{id}/download', name: 'api_system_backups_download', methods: ['GET'])]
    public function download(string $id): BinaryFileResponse|JsonResponse
    {
        try {
            $path = $this->backupService->getDownloadPath($id);
        } catch (DatabaseBackupException $e) {
            return $this->backupError($e);
        }

        $response = new BinaryFileResponse($path);
        $response->setContentDisposition(ResponseHeaderBag::DISPOSITION_ATTACHMENT, basename($path));

        return $response;
    }

    #[Route('/{id}', name: 'api_system_backups_delete', methods: ['DELETE'])]
    public function delete(string $id): JsonResponse
    {
        try {
            $this->backupService->deleteBackup($id);

            return $this->json(null, Response::HTTP_NO_CONTENT);
        } catch (DatabaseBackupException $e) {
            return $this->backupError($e);
        }
    }

    private function backupError(DatabaseBackupException $e): JsonResponse
    {
        $payload = ['message' => $e->getMessage()];
        if ($e->getContext() !== []) {
            $payload = array_merge($payload, $e->getContext());
        }

        return $this->json($payload, Response::HTTP_UNPROCESSABLE_ENTITY);
    }
}
