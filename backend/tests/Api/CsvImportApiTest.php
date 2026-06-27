<?php

declare(strict_types=1);

namespace App\Tests\Api;

use App\Tests\Support\ApiTestCase;

final class CsvImportApiTest extends ApiTestCase
{
    public function testIndexRequiresAuth(): void
    {
        $this->requestJson('GET', '/api/csv-imports');

        $this->assertJsonResponse(401);
    }

    public function testIndexWithTokenReturnsPagedList(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson('GET', '/api/csv-imports', token: self::TEST_USER_TOKEN);

        $data = $this->assertJsonResponse(200);
        self::assertArrayHasKey('data', $data);
        self::assertArrayHasKey('meta', $data);
        self::assertIsArray($data['data']);
    }

    public function testProvidersWithTokenReturnsList(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson('GET', '/api/csv-imports/providers', token: self::TEST_USER_TOKEN);

        $data = $this->assertJsonResponse(200);
        self::assertIsArray($data);
    }

    public function testIndexWithInvalidSourceReturns422(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson('GET', '/api/csv-imports?source=INVALID', token: self::TEST_USER_TOKEN);

        $this->assertJsonResponse(422);
    }

    public function testShowUnknownIdReturns404(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson('GET', '/api/csv-imports/999999', token: self::TEST_USER_TOKEN);

        $data = $this->assertJsonResponse(404);
        self::assertArrayHasKey('message', $data);
    }
}
