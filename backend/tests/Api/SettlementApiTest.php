<?php

declare(strict_types=1);

namespace App\Tests\Api;

use App\Tests\Support\ApiTestCase;

final class SettlementApiTest extends ApiTestCase
{
    public function testIndexRequiresAuth(): void
    {
        $this->requestJson('GET', '/api/reports/settlements');

        $this->assertJsonResponse(401);
    }

    public function testIndexWithInvalidNextDepositorReturns422(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson('GET', '/api/reports/settlements?nextDepositor=invalid', token: self::TEST_USER_TOKEN);

        $this->assertJsonResponse(422);
    }

    public function testIndexWithoutConfigReturns422(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson('GET', '/api/reports/settlements', token: self::TEST_USER_TOKEN);

        $data = $this->assertJsonResponse(422);
        self::assertArrayHasKey('message', $data);
        self::assertArrayHasKey('config', $data);
    }

    public function testIndexWithConflictingPeriodParamsReturns422(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson(
            'GET',
            '/api/reports/settlements?settlementYear=2025&dateFrom=2025-01-01',
            token: self::TEST_USER_TOKEN,
        );

        $this->assertJsonResponse(422);
    }

    public function testPeriodsWithoutConfigReturns422(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson('GET', '/api/reports/settlements/periods', token: self::TEST_USER_TOKEN);

        $this->assertJsonResponse(422);
    }
}
