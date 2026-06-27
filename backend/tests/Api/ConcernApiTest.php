<?php

declare(strict_types=1);

namespace App\Tests\Api;

use App\Tests\Support\ApiTestCase;

final class ConcernApiTest extends ApiTestCase
{
    public function testIndexRequiresAuth(): void
    {
        $this->requestJson('GET', '/api/concerns');

        $this->assertJsonResponse(401);
    }

    public function testIndexWithTokenReturnsArray(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson('GET', '/api/concerns', token: self::TEST_USER_TOKEN);

        $data = $this->assertJsonResponse(200);
        self::assertIsArray($data);
    }

    public function testCreateWithoutNameReturns422(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson('POST', '/api/concerns', [], self::TEST_USER_TOKEN);

        $data = $this->assertJsonResponse(422);
        self::assertArrayHasKey('message', $data);
    }

    public function testShowUnknownIdReturns404(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson('GET', '/api/concerns/999999', token: self::TEST_USER_TOKEN);

        $data = $this->assertJsonResponse(404);
        self::assertArrayHasKey('message', $data);
    }
}
