<?php

namespace App\System\Service;

use Symfony\Component\HttpKernel\KernelInterface;

final class AppInfoProvider
{
    private const DEFAULT_VERSION = '0.1.0';

    private const BUILD_INFO_PATH = __DIR__ . '/../../../config/build_info.json';

    public function __construct(
        private readonly KernelInterface $kernel,
    ) {}

    /**
     * @return array{
     *     status: string,
     *     app: string,
     *     version: string,
     *     environment: string,
     *     debug: bool,
     *     build: string|null,
     *     commit: string|null,
     *     profilerUrl: string|null
     * }
     */
    public function getInfo(): array
    {
        $buildInfo = $this->readBuildInfo();
        $environment = $this->kernel->getEnvironment();

        return [
            'status'      => 'ok',
            'app'         => 'SamFin',
            'version'     => $buildInfo['version'] ?? self::DEFAULT_VERSION,
            'environment' => $environment,
            'debug'       => $this->kernel->isDebug(),
            'build'       => $buildInfo['build'] ?? null,
            'commit'      => $buildInfo['commit'] ?? null,
            'profilerUrl' => $this->resolveProfilerUrl($environment),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function readBuildInfo(): array
    {
        if (!is_readable(self::BUILD_INFO_PATH)) {
            return [];
        }

        $data = json_decode((string) file_get_contents(self::BUILD_INFO_PATH), true);

        return is_array($data) ? $data : [];
    }

    private function resolveProfilerUrl(string $environment): ?string
    {
        if ($environment === 'prod') {
            return null;
        }

        if (!class_exists(\Symfony\Bundle\WebProfilerBundle\WebProfilerBundle::class)) {
            return null;
        }

        return '/_profiler';
    }
}
