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

    public function testIndexWithConflictingPeriodParamsReturns422(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson(
            'GET',
            '/api/reports/settlements?year=2025&month=1&dateFrom=2025-01-01',
            token: self::TEST_USER_TOKEN,
        );

        $this->assertJsonResponse(422);
    }
}
