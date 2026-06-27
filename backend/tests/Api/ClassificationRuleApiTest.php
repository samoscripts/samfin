<?php

declare(strict_types=1);

namespace App\Tests\Api;

use App\Home\Configuration\Entity\Party;
use App\Tests\Support\ApiTestCase;

final class ClassificationRuleApiTest extends ApiTestCase
{
    public function testIndexRequiresAuth(): void
    {
        $this->requestJson('GET', '/api/parties/1/classification-rules');

        $this->assertJsonResponse(401);
    }

    public function testIndexForUnknownPartyReturns404(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson('GET', '/api/parties/999999/classification-rules', token: self::TEST_USER_TOKEN);

        $data = $this->assertJsonResponse(404);
        self::assertArrayHasKey('message', $data);
    }

    public function testIndexForPartyReturnsArray(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson('POST', '/api/parties', [
            'name'          => 'Test Party Rules',
            'type'          => Party::TYPE_OTHER,
            'ownershipType' => Party::OWNERSHIP_EXTERNAL,
        ], self::TEST_USER_TOKEN);
        $party = $this->assertJsonResponse(201);

        $this->requestJson(
            'GET',
            '/api/parties/' . $party['id'] . '/classification-rules',
            token: self::TEST_USER_TOKEN,
        );

        $data = $this->assertJsonResponse(200);
        self::assertIsArray($data);
    }
}
