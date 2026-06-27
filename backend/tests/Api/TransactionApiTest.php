<?php

declare(strict_types=1);

namespace App\Tests\Api;

use App\Tests\Support\ApiTestCase;

final class TransactionApiTest extends ApiTestCase
{
    public function testIndexRequiresAuth(): void
    {
        $this->requestJson('GET', '/api/transactions');

        $this->assertJsonResponse(401);
    }

    public function testIndexWithTokenReturnsList(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson('GET', '/api/transactions', token: self::TEST_USER_TOKEN);

        $data = $this->assertJsonResponse(200);
        self::assertArrayHasKey('data', $data);
        self::assertIsArray($data['data']);
    }
}
