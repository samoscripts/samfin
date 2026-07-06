<?php

declare(strict_types=1);

namespace App\Tests\Smoke;

use App\Tests\Support\ApiTestCase;
use PHPUnit\Framework\Attributes\DataProvider;

final class AuthenticatedApiSmokeTest extends ApiTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->createUser(apiToken: self::TEST_USER_TOKEN);
    }

    /**
     * @return iterable<string, array{0: string, 1: int}>
     */
    public static function readableEndpointsProvider(): iterable
    {
        yield 'categories' => ['/api/categories', 200];
        yield 'wallets' => ['/api/wallets', 200];
        yield 'concerns' => ['/api/concerns', 200];
        yield 'parties' => ['/api/parties', 200];
        yield 'party-bank-accounts' => ['/api/party-bank-accounts', 200];
        yield 'transactions' => ['/api/transactions', 200];
        yield 'transactions-stats' => ['/api/transactions/stats', 200];
        yield 'transaction-templates' => ['/api/transaction-templates?direction=EXPENSE', 200];
        yield 'classification-rules' => ['/api/classification-rules', 200];
        yield 'csv-imports' => ['/api/csv-imports', 200];
        yield 'csv-imports-providers' => ['/api/csv-imports/providers', 200];
        yield 'reports-analytics' => ['/api/reports/analytics', 200];
        yield 'reports-settlements-config' => ['/api/reports/settlements/config', 200];
        yield 'reports-settlements' => ['/api/reports/settlements', 422];
        yield 'reports-settlements-periods' => ['/api/reports/settlements/periods', 422];
        yield 'category-pick-events-frequent' => ['/api/category-pick-events/frequent?direction=EXPENSE', 200];
        yield 'auth-me' => ['/api/auth/me', 200];
    }

    #[DataProvider('readableEndpointsProvider')]
    public function testReadableEndpointRespondsWithExpectedStatus(string $path, int $expectedStatus): void
    {
        $this->requestJson('GET', $path, token: self::TEST_USER_TOKEN);

        $this->assertJsonResponse($expectedStatus);
    }
}
