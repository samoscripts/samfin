<?php

declare(strict_types=1);

namespace App\Tests\Api;

use App\Tests\Support\ApiTestCase;

final class ReportSavedApiTest extends ApiTestCase
{
    public function testIndexRequiresAuth(): void
    {
        $this->requestJson('GET', '/api/report-saved?type=breakdown');

        $this->assertJsonResponse(401);
    }

    public function testCreateAndListBreakdownReport(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson(
            'POST',
            '/api/report-saved',
            [
                'type' => 'breakdown',
                'name' => 'Mój breakdown',
                'description' => 'Test opis',
                'params' => [
                    'period' => ['mode' => 'month', 'year' => 2025, 'month' => 1, 'quarter' => 1],
                    'groupBy' => 'categoryMain',
                    'reportDirection' => 'EXPENSE',
                    'chartTop' => 5,
                    'filters' => [],
                ],
            ],
            token: self::TEST_USER_TOKEN,
        );

        $created = $this->assertJsonResponse(201);
        self::assertSame('Mój breakdown', $created['name']);
        self::assertSame('Test opis', $created['description']);

        $this->requestJson(
            'GET',
            '/api/report-saved?type=breakdown',
            token: self::TEST_USER_TOKEN,
        );

        $list = $this->assertJsonResponse(200);
        self::assertCount(1, $list);
        self::assertSame('Mój breakdown', $list[0]['name']);
    }

    public function testCreateAndReadBreakdownWithReportDirections(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson(
            'POST',
            '/api/report-saved',
            [
                'type' => 'breakdown',
                'name' => 'Breakdown oba kierunki',
                'params' => [
                    'period' => ['mode' => 'month', 'year' => 2025, 'month' => 1, 'quarter' => 1],
                    'groupBy' => 'categoryMain',
                    'reportDirections' => ['EXPENSE', 'INCOME'],
                    'chartTop' => 5,
                    'filters' => [],
                ],
            ],
            token: self::TEST_USER_TOKEN,
        );

        $created = $this->assertJsonResponse(201);
        self::assertSame('Breakdown oba kierunki', $created['name']);

        $this->requestJson(
            'GET',
            '/api/report-saved?type=breakdown',
            token: self::TEST_USER_TOKEN,
        );

        $list = $this->assertJsonResponse(200);
        self::assertCount(1, $list);
        self::assertSame(['EXPENSE', 'INCOME'], $list[0]['params']['reportDirections']);
    }

    public function testDuplicateNameReturns422(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $payload = [
            'type' => 'trend',
            'name' => 'Trend A',
            'params' => ['period' => ['mode' => 'month', 'year' => 2025, 'month' => 1, 'quarter' => 1], 'query' => []],
        ];

        $this->requestJson('POST', '/api/report-saved', $payload, token: self::TEST_USER_TOKEN);
        $this->assertJsonResponse(201);

        $this->requestJson('POST', '/api/report-saved', $payload, token: self::TEST_USER_TOKEN);
        $this->assertJsonResponse(422);
    }
}
