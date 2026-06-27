<?php

declare(strict_types=1);

namespace App\Tests\Smoke;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class HealthApiTest extends WebTestCase
{
    public function testHealthReturnsOk(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/health');

        self::assertResponseIsSuccessful();

        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
        self::assertSame('ok', $data['status'] ?? null);
        self::assertSame('SamFin', $data['app'] ?? null);
        self::assertArrayHasKey('version', $data);
        self::assertArrayHasKey('environment', $data);
        self::assertSame('test', $data['environment']);
    }
}
