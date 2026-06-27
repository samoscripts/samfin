<?php

declare(strict_types=1);

namespace App\Tests\Smoke;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class SecuritySmokeTest extends WebTestCase
{
    public function testProtectedEndpointRequiresAuth(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/categories');

        self::assertResponseStatusCodeSame(401);

        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
        self::assertArrayHasKey('message', $data);
    }

    public function testLoginOptionsIsPublic(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/auth/login-options');

        self::assertResponseIsSuccessful();
    }
}
