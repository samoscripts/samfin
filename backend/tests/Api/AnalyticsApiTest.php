<?php

declare(strict_types=1);

namespace App\Tests\Api;

use App\Tests\Support\ApiTestCase;

final class AnalyticsApiTest extends ApiTestCase
{
    public function testIndexRequiresAuth(): void
    {
        $this->requestJson('GET', '/api/reports/analytics');

        $this->assertJsonResponse(401);
    }

    public function testIndexWithTokenReturnsStats(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson('GET', '/api/reports/analytics', token: self::TEST_USER_TOKEN);

        $data = $this->assertJsonResponse(200);
        self::assertArrayHasKey('year', $data);
        self::assertArrayHasKey('month', $data);
        self::assertArrayHasKey('income', $data);
        self::assertArrayHasKey('expenses', $data);
        self::assertArrayHasKey('balance', $data);
    }

    public function testIndexWithInvalidMonthReturns422(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson('GET', '/api/reports/analytics?month=13', token: self::TEST_USER_TOKEN);

        $this->assertJsonResponse(422);
    }
}
