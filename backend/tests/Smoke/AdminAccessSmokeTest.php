<?php

declare(strict_types=1);

namespace App\Tests\Smoke;

use App\Identity\Entity\User;
use App\Tests\Support\ApiTestCase;
use PHPUnit\Framework\Attributes\DataProvider;

final class AdminAccessSmokeTest extends ApiTestCase
{
    /**
     * @return iterable<string, array{0: string}>
     */
    public static function adminEndpointsProvider(): iterable
    {
        yield 'users' => ['/api/users'];
        yield 'system-backups' => ['/api/system/backups'];
        yield 'system-transactions-export' => ['/api/system/transactions/export'];
    }

    #[DataProvider('adminEndpointsProvider')]
    public function testAdminEndpointDeniedForRegularUser(string $path): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson('GET', $path, token: self::TEST_USER_TOKEN);

        self::assertResponseStatusCodeSame(403);
    }

    /**
     * @return iterable<string, array{0: string}>
     */
    public static function adminJsonEndpointsProvider(): iterable
    {
        yield 'users' => ['/api/users'];
        yield 'system-backups' => ['/api/system/backups'];
    }

    #[DataProvider('adminJsonEndpointsProvider')]
    public function testAdminJsonEndpointAllowedForAdmin(string $path): void
    {
        $this->createUser(
            role: User::ROLE_ADMIN,
            apiToken: self::TEST_ADMIN_TOKEN,
            email: self::TEST_ADMIN_EMAIL,
            password: self::TEST_ADMIN_PASSWORD,
        );

        $this->requestJson('GET', $path, token: self::TEST_ADMIN_TOKEN);

        $data = $this->assertJsonResponse(200);
        self::assertIsArray($data);
    }

    public function testAdminTransactionsExportAllowedForAdmin(): void
    {
        $this->createUser(
            role: User::ROLE_ADMIN,
            apiToken: self::TEST_ADMIN_TOKEN,
            email: self::TEST_ADMIN_EMAIL,
            password: self::TEST_ADMIN_PASSWORD,
        );

        $this->requestJson('GET', '/api/system/transactions/export', token: self::TEST_ADMIN_TOKEN);

        self::assertResponseIsSuccessful();
        self::assertStringContainsString(
            'application/json',
            (string) $this->client->getResponse()->headers->get('Content-Type'),
        );
    }
}
