<?php

declare(strict_types=1);

namespace App\Tests\Smoke;

use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class SecuritySmokeTest extends WebTestCase
{
    /**
     * @return iterable<string, array{0: string, 1: string}>
     */
    public static function protectedGetEndpointsProvider(): iterable
    {
        yield 'categories' => ['GET', '/api/categories'];
        yield 'wallets' => ['GET', '/api/wallets'];
        yield 'concerns' => ['GET', '/api/concerns'];
        yield 'parties' => ['GET', '/api/parties'];
        yield 'party-bank-accounts' => ['GET', '/api/party-bank-accounts'];
        yield 'transactions' => ['GET', '/api/transactions'];
        yield 'transactions-stats' => ['GET', '/api/transactions/stats'];
        yield 'transaction-templates' => ['GET', '/api/transaction-templates'];
        yield 'classification-rules' => ['GET', '/api/classification-rules'];
        yield 'csv-imports' => ['GET', '/api/csv-imports'];
        yield 'csv-imports-providers' => ['GET', '/api/csv-imports/providers'];
        yield 'reports-analytics' => ['GET', '/api/reports/analytics'];
        yield 'reports-settlements' => ['GET', '/api/reports/settlements'];
        yield 'reports-settlements-periods' => ['GET', '/api/reports/settlements/periods'];
        yield 'reports-settlements-config' => ['GET', '/api/reports/settlements/config'];
        yield 'category-pick-events-frequent' => ['GET', '/api/category-pick-events/frequent?direction=EXPENSE'];
        yield 'auth-me' => ['GET', '/api/auth/me'];
    }

    /**
     * @return iterable<string, array{0: string, 1: string}>
     */
    public static function adminGetEndpointsProvider(): iterable
    {
        yield 'users' => ['GET', '/api/users'];
        yield 'system-backups' => ['GET', '/api/system/backups'];
        yield 'system-transactions-export' => ['GET', '/api/system/transactions/export'];
    }

    #[DataProvider('protectedGetEndpointsProvider')]
    public function testProtectedGetEndpointRequiresAuth(string $method, string $path): void
    {
        $client = static::createClient();
        $client->request($method, $path);

        self::assertResponseStatusCodeSame(401);

        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
        self::assertArrayHasKey('message', $data);
    }

    #[DataProvider('adminGetEndpointsProvider')]
    public function testAdminGetEndpointRequiresAuth(string $method, string $path): void
    {
        $client = static::createClient();
        $client->request($method, $path);

        self::assertResponseStatusCodeSame(401);

        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
        self::assertArrayHasKey('message', $data);
    }

    public function testLogoutRequiresAuth(): void
    {
        $client = static::createClient();
        $client->request(
            'POST',
            '/api/auth/logout',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: '{}',
        );

        self::assertResponseStatusCodeSame(401);

        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
        self::assertArrayHasKey('message', $data);
    }

    public function testLoginOptionsIsPublic(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/auth/login-options');

        self::assertResponseIsSuccessful();

        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
    }

    public function testLoginWithoutCredentialsIsPublicButReturns400(): void
    {
        $client = static::createClient();
        $client->request(
            'POST',
            '/api/auth/login',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: '{}',
        );

        self::assertResponseStatusCodeSame(400);

        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
        self::assertFalse($data['success'] ?? true);
    }
}
