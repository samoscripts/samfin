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

    public function testCreateWithTransCustomDescription(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson('POST', '/api/transactions', [
            'direction' => 'EXPENSE',
            'transDate' => '2026-06-01',
            'amount' => 50.00,
            'transDescription' => 'Test opis bankowy',
            'transCustomDescription' => 'Moja notatka',
        ], self::TEST_USER_TOKEN);

        $data = $this->assertJsonResponse(201);
        self::assertSame('Moja notatka', $data['transCustomDescription']);
        self::assertSame('Test opis bankowy', $data['transDescription']);
    }

    public function testClassifyUpdatesTransCustomDescription(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson('POST', '/api/transactions', [
            'direction' => 'EXPENSE',
            'transDate' => '2026-06-02',
            'amount' => 25.00,
            'transDescription' => 'Do edycji',
        ], self::TEST_USER_TOKEN);

        $created = $this->assertJsonResponse(201);
        $id = (int) $created['transactionId'];

        $this->requestJson('PUT', "/api/transactions/{$id}/items", [
            'transCustomDescription' => 'Po edycji',
            'items' => [
                ['amount' => -25.00],
            ],
        ], self::TEST_USER_TOKEN);

        $updated = $this->assertJsonResponse(200);
        self::assertSame('Po edycji', $updated['transCustomDescription']);
    }

    public function testFilterByTransCustomDescription(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $needle = 'UnikalnyWlasnyOpis' . uniqid('', true);

        $this->requestJson('POST', '/api/transactions', [
            'direction' => 'INCOME',
            'transDate' => '2026-06-03',
            'amount' => 10.00,
            'transDescription' => 'Inny opis',
            'transCustomDescription' => $needle,
        ], self::TEST_USER_TOKEN);

        $this->assertJsonResponse(201);

        $this->requestJson('GET', '/api/transactions?description=' . urlencode($needle), token: self::TEST_USER_TOKEN);

        $list = $this->assertJsonResponse(200);
        self::assertNotEmpty($list['data']);
        self::assertSame($needle, $list['data'][0]['transCustomDescription']);
    }

    public function testCreateTemplateWithTransCustomDescription(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson('POST', '/api/transaction-templates', [
            'name' => 'Szablon z notatką',
            'direction' => 'EXPENSE',
            'paidFromPartyId' => null,
            'paidToPartyId' => null,
            'walletId' => null,
            'concernId' => null,
            'categoryId' => null,
            'transCustomDescription' => 'Notatka szablonu',
        ], self::TEST_USER_TOKEN);

        $data = $this->assertJsonResponse(201);
        self::assertSame('Notatka szablonu', $data['transCustomDescription']);
    }

    public function testBulkUpdateTransCustomDescription(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson('POST', '/api/transactions', [
            'direction' => 'EXPENSE',
            'transDate' => '2026-06-04',
            'amount' => 15.00,
            'transDescription' => 'Bulk test 1',
        ], self::TEST_USER_TOKEN);
        $tx1 = $this->assertJsonResponse(201);

        $this->requestJson('POST', '/api/transactions', [
            'direction' => 'EXPENSE',
            'transDate' => '2026-06-05',
            'amount' => 20.00,
            'transDescription' => 'Bulk test 2',
        ], self::TEST_USER_TOKEN);
        $tx2 = $this->assertJsonResponse(201);

        $this->requestJson('PUT', '/api/transactions/bulk-update', [
            'transactionIds' => [$tx1['transactionId'], $tx2['transactionId']],
            'fields' => ['transCustomDescription'],
            'values' => ['transCustomDescription' => 'Wspólna notatka'],
        ], self::TEST_USER_TOKEN);

        $result = $this->assertJsonResponse(200);
        self::assertSame(2, $result['updated']);

        $this->requestJson('GET', '/api/transactions/' . $tx1['transactionId'], token: self::TEST_USER_TOKEN);
        $show1 = $this->assertJsonResponse(200);
        self::assertSame('Wspólna notatka', $show1['transCustomDescription']);
    }
}
