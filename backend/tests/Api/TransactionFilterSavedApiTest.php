<?php

declare(strict_types=1);

namespace App\Tests\Api;

use App\Tests\Support\ApiTestCase;

final class TransactionFilterSavedApiTest extends ApiTestCase
{
    private const SAMPLE_PARAMS = [
        'filters' => [
            'directions' => ['EXPENSE'],
            'dateFrom' => '2025-01-01',
            'dateTo' => '2025-01-31',
        ],
        'sort' => [
            'field' => 'date',
            'direction' => 'desc',
        ],
        'perPage' => 25,
    ];

    public function testIndexRequiresAuth(): void
    {
        $this->requestJson('GET', '/api/transaction-filter-saved');

        $this->assertJsonResponse(401);
    }

    public function testCreateAndListFilter(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson(
            'POST',
            '/api/transaction-filter-saved',
            [
                'name' => 'Wydatki styczeń',
                'description' => 'Test opis',
                'params' => self::SAMPLE_PARAMS,
            ],
            token: self::TEST_USER_TOKEN,
        );

        $created = $this->assertJsonResponse(201);
        self::assertSame('Wydatki styczeń', $created['name']);
        self::assertSame('Test opis', $created['description']);
        self::assertSame(self::SAMPLE_PARAMS['sort'], $created['params']['sort']);

        $this->requestJson(
            'GET',
            '/api/transaction-filter-saved',
            token: self::TEST_USER_TOKEN,
        );

        $list = $this->assertJsonResponse(200);
        self::assertCount(1, $list);
        self::assertSame('Wydatki styczeń', $list[0]['name']);
    }

    public function testUpdateAndDeleteFilter(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson(
            'POST',
            '/api/transaction-filter-saved',
            [
                'name' => 'Filtr A',
                'params' => self::SAMPLE_PARAMS,
            ],
            token: self::TEST_USER_TOKEN,
        );

        $created = $this->assertJsonResponse(201);
        $id = $created['id'];

        $this->requestJson(
            'PUT',
            '/api/transaction-filter-saved/' . $id,
            [
                'name' => 'Filtr A (zmieniony)',
                'params' => [
                    'filters' => [],
                    'sort' => ['field' => 'amount', 'direction' => 'asc'],
                    'perPage' => 50,
                ],
            ],
            token: self::TEST_USER_TOKEN,
        );

        $updated = $this->assertJsonResponse(200);
        self::assertSame('Filtr A (zmieniony)', $updated['name']);
        self::assertSame('amount', $updated['params']['sort']['field']);

        $this->requestJson(
            'DELETE',
            '/api/transaction-filter-saved/' . $id,
            token: self::TEST_USER_TOKEN,
        );

        self::assertResponseStatusCodeSame(204);

        $this->requestJson(
            'GET',
            '/api/transaction-filter-saved',
            token: self::TEST_USER_TOKEN,
        );

        $list = $this->assertJsonResponse(200);
        self::assertCount(0, $list);
    }

    public function testDuplicateNameReturns422(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $payload = [
            'name' => 'Filtr duplikat',
            'params' => self::SAMPLE_PARAMS,
        ];

        $this->requestJson('POST', '/api/transaction-filter-saved', $payload, token: self::TEST_USER_TOKEN);
        $this->assertJsonResponse(201);

        $this->requestJson('POST', '/api/transaction-filter-saved', $payload, token: self::TEST_USER_TOKEN);
        $this->assertJsonResponse(422);
    }

    public function testInvalidParamsReturns422(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson(
            'POST',
            '/api/transaction-filter-saved',
            [
                'name' => 'Zły filtr',
                'params' => [
                    'filters' => [],
                    'sort' => ['field' => 'invalid', 'direction' => 'desc'],
                    'perPage' => 25,
                ],
            ],
            token: self::TEST_USER_TOKEN,
        );

        $this->assertJsonResponse(422);
    }
}
