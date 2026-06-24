<?php

namespace App\Settings\Service;

use App\Settings\DTO\BackupManifest;
use App\Settings\Exception\DatabaseBackupException;
use App\System\Service\AppInfoProvider;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpKernel\KernelInterface;
use Symfony\Component\Process\Process;
use ZipArchive;

class DatabaseBackupService
{
    private const BACKUP_ID_PATTERN = '/^[0-9a-zA-Z_\.]+$/';
    private const MYSQLDUMP_BIN = 'mysqldump';
    private const MYSQL_BIN = 'mysql';

    private readonly string $backupDir;
    private readonly string $preRestoreDir;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly AppInfoProvider $appInfo,
        private readonly LoggerInterface $logger,
        KernelInterface $kernel,
        #[Autowire('%backup.retention_days%')]
        private readonly int $retentionDays,
        #[Autowire('%backup.max_upload_mb%')]
        private readonly int $maxUploadMb,
        #[Autowire('%backup.pre_restore_keep%')]
        private readonly int $preRestoreKeep,
    ) {
        $this->backupDir = $kernel->getProjectDir() . '/var/backups';
        $this->preRestoreDir = $this->backupDir . '/pre-restore';
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listBackups(): array
    {
        $this->ensureBackupDirectory();

        $entries = [];
        foreach (glob($this->backupDir . '/*.zip') ?: [] as $path) {
            $basename = basename($path);
            $id = substr($basename, 0, -4);
            if (!preg_match(self::BACKUP_ID_PATTERN, $id)) {
                continue;
            }

            $entries[] = $this->buildListEntry($id, $path);
        }

        usort($entries, static fn (array $a, array $b) => strcmp($b['createdAt'], $a['createdAt']));

        return $entries;
    }

    /**
     * @return array<string, mixed>
     */
    public function createBackup(): array
    {
        $this->ensureBackupDirectory();

        $stamp = new \DateTimeImmutable();
        $build = $this->resolveBuildLabel();
        $baseName = $stamp->format('Ymd_His') . '_' . $build;
        $zipPath = $this->backupDir . '/' . $baseName . '.zip';

        $this->writeBackupZip($zipPath, $stamp, $build);
        $this->applyRetention();

        $this->logger->info('Database backup created', ['id' => $baseName, 'path' => $zipPath]);

        return $this->buildListEntry($baseName, $zipPath);
    }

    public function getDownloadPath(string $id): string
    {
        $path = $this->resolveBackupZipPath($id);

        if (!is_readable($path)) {
            throw new DatabaseBackupException('Nie znaleziono kopii zapasowej.');
        }

        return $path;
    }

    public function deleteBackup(string $id): void
    {
        $path = $this->resolveBackupZipPath($id);

        if (!is_file($path) || !unlink($path)) {
            throw new DatabaseBackupException('Nie udało się usunąć kopii zapasowej.');
        }

        $this->logger->info('Database backup deleted', ['id' => $id]);
    }

    /**
     * @return array<string, mixed>
     */
    public function restoreFromUploadedFile(string $zipPath, bool $force = false): array
    {
        return $this->restoreFromZipFile($zipPath, $force, skipPreBackup: false);
    }

    /**
     * @return array<string, mixed>
     */
    public function restoreFromLocalZip(string $zipPath, bool $force = false, bool $skipPreBackup = false): array
    {
        if (!is_readable($zipPath)) {
            throw new DatabaseBackupException('Plik kopii nie istnieje lub jest nieczytelny: ' . $zipPath);
        }

        return $this->restoreFromZipFile($zipPath, $force, $skipPreBackup);
    }

    public function getMaxUploadBytes(): int
    {
        return $this->maxUploadMb * 1024 * 1024;
    }

    /**
     * @return array<string, mixed>
     */
    private function restoreFromZipFile(string $zipPath, bool $force, bool $skipPreBackup): array
    {
        if (!$skipPreBackup) {
            $this->createPreRestoreBackup();
        }

        $extracted = $this->extractAndValidateZip($zipPath, $force);
        $manifest = $extracted['manifest'];
        $sqlPath = $extracted['sqlPath'];

        try {
            $this->importSqlFile($sqlPath);
        } catch (\Throwable $e) {
            $this->logger->error('Database restore failed', [
                'error'    => $e->getMessage(),
                'manifest' => $manifest->toArray(),
            ]);

            throw new DatabaseBackupException(
                'Przywracanie bazy nie powiodło się. Jeśli baza jest w stanie pośrednim, użyj ostatniej kopii z var/backups/pre-restore/ przez CLI: app:database:restore.',
                ['detail' => $e->getMessage()],
            );
        } finally {
            $this->removeDirectory($extracted['tempDir']);
        }

        $this->logger->warning('Database restored from backup', ['manifest' => $manifest->toArray()]);

        return [
            'restored' => true,
            'manifest' => $manifest->toArray(),
        ];
    }

    private function createPreRestoreBackup(): void
    {
        $this->ensureDirectory($this->preRestoreDir);

        $stamp = new \DateTimeImmutable();
        $build = $this->resolveBuildLabel();
        $baseName = 'pre-restore_' . $stamp->format('Ymd_His');
        $zipPath = $this->preRestoreDir . '/' . $baseName . '.zip';

        $this->writeBackupZip($zipPath, $stamp, $build);
        $this->applyPreRestoreRetention();

        $this->logger->info('Pre-restore backup created', ['path' => $zipPath]);
    }

    /**
     * @return array{manifest: BackupManifest, sqlPath: string, tempDir: string}
     */
    private function extractAndValidateZip(string $zipPath, bool $force): array
    {
        $tempDir = sys_get_temp_dir() . '/samfin-restore-' . bin2hex(random_bytes(8));
        if (!mkdir($tempDir, 0700, true) && !is_dir($tempDir)) {
            throw new DatabaseBackupException('Nie udało się utworzyć katalogu tymczasowego.');
        }

        $zip = new ZipArchive();
        if ($zip->open($zipPath) !== true) {
            $this->removeDirectory($tempDir);
            throw new DatabaseBackupException('Nie udało się otworzyć archiwum ZIP.');
        }

        if (!$zip->extractTo($tempDir)) {
            $zip->close();
            $this->removeDirectory($tempDir);
            throw new DatabaseBackupException('Nie udało się rozpakować archiwum ZIP.');
        }
        $zip->close();

        $manifestPath = $tempDir . '/manifest.json';
        if (!is_readable($manifestPath)) {
            $this->removeDirectory($tempDir);
            throw new DatabaseBackupException('Brak pliku manifest.json w archiwum.');
        }

        $manifestData = json_decode((string) file_get_contents($manifestPath), true);
        if (!is_array($manifestData)) {
            $this->removeDirectory($tempDir);
            throw new DatabaseBackupException('Nieprawidłowy plik manifest.json.');
        }

        $manifest = BackupManifest::fromArray($manifestData);
        if ($manifest->type !== BackupManifest::TYPE_DATABASE) {
            $this->removeDirectory($tempDir);
            throw new DatabaseBackupException('Nieobsługiwany typ kopii: ' . $manifest->type);
        }

        $this->validateCompatibility($manifest, $force);

        $sqlPath = $tempDir . '/' . $manifest->sqlFile;
        if (!is_readable($sqlPath)) {
            $this->removeDirectory($tempDir);
            throw new DatabaseBackupException('Brak pliku SQL wskazanego w manifeście: ' . $manifest->sqlFile);
        }

        $actualHash = hash_file('sha256', $sqlPath);
        if ($manifest->sha256 !== '' && !hash_equals($manifest->sha256, $actualHash ?: '')) {
            $this->removeDirectory($tempDir);
            throw new DatabaseBackupException('Suma kontrolna pliku SQL nie zgadza się z manifestem.');
        }

        return [
            'manifest' => $manifest,
            'sqlPath'  => $sqlPath,
            'tempDir'  => $tempDir,
        ];
    }

    private function validateCompatibility(BackupManifest $manifest, bool $force): void
    {
        if ($force) {
            return;
        }

        $appInfo = $this->appInfo->getInfo();
        $currentVersion = (string) $appInfo['version'];
        $currentSchema = $this->getCurrentSchemaVersion();

        $errors = [];

        if ($manifest->version !== $currentVersion) {
            $errors['version'] = [
                'expected' => $currentVersion,
                'got'      => $manifest->version,
            ];
        }

        if ($manifest->schemaVersion !== $currentSchema) {
            $errors['schemaVersion'] = [
                'expected' => $currentSchema,
                'got'      => $manifest->schemaVersion,
            ];
        }

        if ($errors !== []) {
            throw new DatabaseBackupException(
                'Kopia nie jest zgodna z bieżącą wersją aplikacji lub schematem bazy. Użyj kopii z tej samej wersji i migracji albo parametru force (świadome ryzyko).',
                $errors,
            );
        }
    }

    private function writeBackupZip(string $zipPath, \DateTimeImmutable $stamp, string $build): void
    {
        $baseName = pathinfo($zipPath, PATHINFO_FILENAME);
        $sqlFileName = $baseName . '.sql';
        $tempDir = sys_get_temp_dir() . '/samfin-backup-' . bin2hex(random_bytes(8));

        if (!mkdir($tempDir, 0700, true) && !is_dir($tempDir)) {
            throw new DatabaseBackupException('Nie udało się utworzyć katalogu tymczasowego.');
        }

        $sqlPath = $tempDir . '/' . $sqlFileName;

        try {
            $this->runDump($sqlPath);

            $sqlSize = filesize($sqlPath);
            if ($sqlSize === false) {
                throw new DatabaseBackupException('Nie udało się odczytać rozmiaru pliku SQL.');
            }

            $manifest = new BackupManifest(
                type: BackupManifest::TYPE_DATABASE,
                app: 'SamFin',
                version: (string) $this->appInfo->getInfo()['version'],
                build: $this->appInfo->getInfo()['build'],
                commit: $this->appInfo->getInfo()['commit'],
                createdAt: $stamp->format(\DateTimeInterface::ATOM),
                database: $this->getDatabaseName(),
                dbEngine: $this->detectDbEngine(),
                sqlFile: $sqlFileName,
                sizeBytes: $sqlSize,
                sha256: hash_file('sha256', $sqlPath) ?: '',
                schemaVersion: $this->getCurrentSchemaVersion(),
            );

            $manifestPath = $tempDir . '/manifest.json';
            file_put_contents(
                $manifestPath,
                json_encode($manifest->toArray(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n",
            );

            $zip = new ZipArchive();
            if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
                throw new DatabaseBackupException('Nie udało się utworzyć archiwum ZIP.');
            }

            $zip->addFile($sqlPath, $sqlFileName);
            $zip->addFile($manifestPath, 'manifest.json');
            $zip->close();
        } finally {
            $this->removeDirectory($tempDir);
        }
    }

    private function runDump(string $outputPath): void
    {
        $params = $this->getConnectionParams();
        $defaultsFile = $this->createDefaultsFile($params);

        try {
            $command = [
                self::MYSQLDUMP_BIN,
                '--defaults-extra-file=' . $defaultsFile,
                '--host=' . $params['host'],
                '--port=' . $params['port'],
                '--user=' . $params['user'],
                '--single-transaction',
                '--routines',
                '--triggers',
                '--default-character-set=utf8mb4',
                '--no-tablespaces',
                '--result-file=' . $outputPath,
                $params['dbname'],
            ];

            $process = new Process($command);
            $process->setTimeout(null);
            $process->run();

            if (!$process->isSuccessful()) {
                throw new DatabaseBackupException(
                    'mysqldump zakończył się błędem: ' . trim($process->getErrorOutput() ?: $process->getOutput()),
                );
            }
        } finally {
            if (is_file($defaultsFile)) {
                unlink($defaultsFile);
            }
        }
    }

    private function importSqlFile(string $sqlPath): void
    {
        $params = $this->getConnectionParams();
        $defaultsFile = $this->createDefaultsFile($params);

        try {
            $command = [
                self::MYSQL_BIN,
                '--defaults-extra-file=' . $defaultsFile,
                '--host=' . $params['host'],
                '--port=' . $params['port'],
                '--user=' . $params['user'],
                $params['dbname'],
            ];

            $process = new Process($command);
            $process->setInput(file_get_contents($sqlPath) ?: '');
            $process->setTimeout(null);
            $process->run();

            if (!$process->isSuccessful()) {
                throw new DatabaseBackupException(
                    'mysql import zakończył się błędem: ' . trim($process->getErrorOutput() ?: $process->getOutput()),
                );
            }
        } finally {
            if (is_file($defaultsFile)) {
                unlink($defaultsFile);
            }
        }
    }

    /**
     * @return array{host: string, port: string, user: string, password: string, dbname: string}
     */
    private function getConnectionParams(): array
    {
        $params = $this->em->getConnection()->getParams();

        return [
            'host'     => (string) ($params['host'] ?? '127.0.0.1'),
            'port'     => (string) ($params['port'] ?? 3306),
            'user'     => (string) ($params['user'] ?? ''),
            'password' => (string) ($params['password'] ?? ''),
            'dbname'   => (string) ($params['dbname'] ?? ''),
        ];
    }

    /**
     * @param array{password: string} $params
     */
    private function createDefaultsFile(array $params): string
    {
        $path = sys_get_temp_dir() . '/samfin-db-' . bin2hex(random_bytes(8)) . '.cnf';
        $content = "[client]\npassword=" . str_replace(["\n", "\r"], '', $params['password']) . "\n";
        file_put_contents($path, $content);
        chmod($path, 0600);

        return $path;
    }

    private function getDatabaseName(): string
    {
        return $this->getConnectionParams()['dbname'];
    }

    private function getCurrentSchemaVersion(): string
    {
        $connection = $this->em->getConnection();
        $table = $connection->getDatabasePlatform()->quoteIdentifier('doctrine_migration_versions');

        try {
            $version = $connection->fetchOne(
                'SELECT version FROM ' . $table . ' ORDER BY executed_at DESC, version DESC LIMIT 1',
            );
        } catch (\Throwable) {
            return '';
        }

        return is_string($version) ? $version : '';
    }

    private function detectDbEngine(): string
    {
        try {
            $version = (string) $this->em->getConnection()->fetchOne('SELECT VERSION()');
        } catch (\Throwable) {
            return 'unknown';
        }

        return stripos($version, 'mariadb') !== false ? 'mariadb' : 'mysql';
    }

    private function resolveBuildLabel(): string
    {
        $build = $this->appInfo->getInfo()['build'];

        return is_string($build) && $build !== '' ? $build : 'nobuild';
    }

    /**
     * @return array<string, mixed>
     */
    private function buildListEntry(string $id, string $zipPath): array
    {
        $manifest = $this->readManifestFromZip($zipPath);
        $mtime = filemtime($zipPath) ?: time();

        return [
            'id'            => $id,
            'filename'      => basename($zipPath),
            'createdAt'     => $manifest?->createdAt ?? (new \DateTimeImmutable('@' . $mtime))->format(\DateTimeInterface::ATOM),
            'sizeBytes'     => filesize($zipPath) ?: 0,
            'version'       => $manifest?->version,
            'build'         => $manifest?->build,
            'commit'        => $manifest?->commit,
            'schemaVersion' => $manifest?->schemaVersion,
            'dbEngine'      => $manifest?->dbEngine,
        ];
    }

    private function readManifestFromZip(string $zipPath): ?BackupManifest
    {
        $zip = new ZipArchive();
        if ($zip->open($zipPath) !== true) {
            return null;
        }

        $json = $zip->getFromName('manifest.json');
        $zip->close();

        if ($json === false) {
            return null;
        }

        $data = json_decode($json, true);

        return is_array($data) ? BackupManifest::fromArray($data) : null;
    }

    private function resolveBackupZipPath(string $id): string
    {
        if (!preg_match(self::BACKUP_ID_PATTERN, $id)) {
            throw new DatabaseBackupException('Nieprawidłowy identyfikator kopii.');
        }

        return $this->backupDir . '/' . $id . '.zip';
    }

    private function ensureBackupDirectory(): void
    {
        $this->ensureDirectory($this->backupDir);
    }

    private function ensureDirectory(string $path): void
    {
        if (!is_dir($path) && !mkdir($path, 0750, true) && !is_dir($path)) {
            throw new DatabaseBackupException('Nie udało się utworzyć katalogu: ' . $path);
        }
    }

    private function applyRetention(): void
    {
        $cutoff = (new \DateTimeImmutable())->modify('-' . $this->retentionDays . ' days')->getTimestamp();

        foreach (glob($this->backupDir . '/*.zip') ?: [] as $path) {
            $mtime = filemtime($path);
            if ($mtime !== false && $mtime < $cutoff) {
                @unlink($path);
            }
        }
    }

    private function applyPreRestoreRetention(): void
    {
        $files = glob($this->preRestoreDir . '/pre-restore_*.zip') ?: [];
        usort($files, static fn (string $a, string $b) => filemtime($b) <=> filemtime($a));

        foreach (array_slice($files, $this->preRestoreKeep) as $old) {
            @unlink($old);
        }
    }

    private function removeDirectory(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }

        $items = scandir($dir);
        if ($items === false) {
            return;
        }

        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }

            $path = $dir . '/' . $item;
            if (is_dir($path)) {
                $this->removeDirectory($path);
            } else {
                @unlink($path);
            }
        }

        @rmdir($dir);
    }
}
