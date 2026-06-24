<?php

namespace App\Settings\DTO;

final readonly class BackupManifest
{
    public const TYPE_DATABASE = 'database';

    /**
     * @param array<string, mixed> $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            type: (string) ($data['type'] ?? ''),
            app: (string) ($data['app'] ?? ''),
            version: (string) ($data['version'] ?? ''),
            build: isset($data['build']) ? (string) $data['build'] : null,
            commit: isset($data['commit']) ? (string) $data['commit'] : null,
            createdAt: (string) ($data['createdAt'] ?? ''),
            database: (string) ($data['database'] ?? ''),
            dbEngine: isset($data['dbEngine']) ? (string) $data['dbEngine'] : null,
            sqlFile: (string) ($data['sqlFile'] ?? ''),
            sizeBytes: (int) ($data['sizeBytes'] ?? 0),
            sha256: (string) ($data['sha256'] ?? ''),
            schemaVersion: (string) ($data['schemaVersion'] ?? ''),
        );
    }

    public function __construct(
        public string $type,
        public string $app,
        public string $version,
        public ?string $build,
        public ?string $commit,
        public string $createdAt,
        public string $database,
        public ?string $dbEngine,
        public string $sqlFile,
        public int $sizeBytes,
        public string $sha256,
        public string $schemaVersion,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return array_filter([
            'type'          => $this->type,
            'app'           => $this->app,
            'version'       => $this->version,
            'build'         => $this->build,
            'commit'        => $this->commit,
            'createdAt'     => $this->createdAt,
            'database'      => $this->database,
            'dbEngine'      => $this->dbEngine,
            'sqlFile'       => $this->sqlFile,
            'sizeBytes'     => $this->sizeBytes,
            'sha256'        => $this->sha256,
            'schemaVersion' => $this->schemaVersion,
        ], static fn (mixed $v) => $v !== null);
    }
}
