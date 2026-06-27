<?php

declare(strict_types=1);

namespace App\Tests\Api;

use App\Tests\Support\ApiTestCase;

final class ClassificationRulesApiTest extends ApiTestCase
{
    public function testIndexRequiresAuth(): void
    {
        $this->requestJson('GET', '/api/classification-rules');

        $this->assertJsonResponse(401);
    }

    public function testIndexWithTokenReturnsArray(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson('GET', '/api/classification-rules', token: self::TEST_USER_TOKEN);

        $data = $this->assertJsonResponse(200);
        self::assertIsArray($data);
    }
}
