<?php

declare(strict_types=1);

namespace App\Tests\Api;

use App\Tests\Support\ApiTestCase;

final class CategoryApiTest extends ApiTestCase
{
    public function testIndexRequiresAuth(): void
    {
        $this->requestJson('GET', '/api/categories');

        $this->assertJsonResponse(401);
    }

    public function testIndexWithTokenReturnsArray(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson('GET', '/api/categories', token: self::TEST_USER_TOKEN);

        $data = $this->assertJsonResponse(200);
        self::assertIsArray($data);
    }

    public function testMergeWithoutIdsReturns422(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson('POST', '/api/categories/merge', [], self::TEST_USER_TOKEN);

        $data = $this->assertJsonResponse(422);
        self::assertArrayHasKey('message', $data);
    }

    public function testDeleteActiveCategoryDeactivates(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson('POST', '/api/categories', [
            'name'     => 'Test group',
            'parentId' => null,
        ], self::TEST_USER_TOKEN);
        $created = $this->assertJsonResponse(201);
        $id = (int) $created['id'];

        $this->requestJson('DELETE', '/api/categories/' . $id, token: self::TEST_USER_TOKEN);
        $data = $this->assertJsonResponse(200);
        self::assertSame('Kategoria dezaktywowana.', $data['message']);

        $this->requestJson('GET', '/api/categories/' . $id, token: self::TEST_USER_TOKEN);
        $show = $this->assertJsonResponse(200);
        self::assertFalse($show['active']);
    }

    public function testDeleteInactiveCategoryRemovesFromDatabase(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson('POST', '/api/categories', [
            'name'     => 'To remove',
            'parentId' => null,
            'active'   => false,
        ], self::TEST_USER_TOKEN);
        $created = $this->assertJsonResponse(201);
        $id = (int) $created['id'];

        $this->requestJson('DELETE', '/api/categories/' . $id, token: self::TEST_USER_TOKEN);
        $data = $this->assertJsonResponse(200);
        self::assertSame('Kategoria usunięta.', $data['message']);

        $this->requestJson('GET', '/api/categories/' . $id, token: self::TEST_USER_TOKEN);
        $this->assertJsonResponse(404);
    }

    public function testDeleteInactiveGroupWithChildrenReturns422(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson('POST', '/api/categories', [
            'name'     => 'Parent group',
            'parentId' => null,
            'active'   => false,
        ], self::TEST_USER_TOKEN);
        $parent = $this->assertJsonResponse(201);

        $this->requestJson('POST', '/api/categories', [
            'name'     => 'Child',
            'parentId' => $parent['id'],
            'active'   => false,
        ], self::TEST_USER_TOKEN);
        $this->assertJsonResponse(201);

        $this->requestJson('DELETE', '/api/categories/' . $parent['id'], token: self::TEST_USER_TOKEN);
        $data = $this->assertJsonResponse(422);
        self::assertSame('Usuń najpierw subkategorie tej grupy.', $data['message']);
    }

    public function testUsersEndpointDeniedForRegularUser(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson('GET', '/api/users', token: self::TEST_USER_TOKEN);

        self::assertResponseStatusCodeSame(403);
    }
}
