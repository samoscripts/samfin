<?php

declare(strict_types=1);

namespace App\Tests\Api;

use App\Tests\Support\ApiTestCase;

final class TransactionTemplateApiTest extends ApiTestCase
{
    public function testIndexRequiresAuth(): void
    {
        $this->requestJson('GET', '/api/transaction-templates');

        $this->assertJsonResponse(401);
    }

    public function testIndexWithoutDirectionReturns422(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson('GET', '/api/transaction-templates', token: self::TEST_USER_TOKEN);

        $data = $this->assertJsonResponse(422);
        self::assertArrayHasKey('message', $data);
    }

    public function testIndexWithDirectionReturnsArray(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson('GET', '/api/transaction-templates?direction=EXPENSE', token: self::TEST_USER_TOKEN);

        $data = $this->assertJsonResponse(200);
        self::assertIsArray($data);
    }
}
