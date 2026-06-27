<?php

declare(strict_types=1);

namespace App\Tests\Api;

use App\Identity\Entity\User;
use App\Tests\Support\ApiTestCase;

final class DatabaseBackupApiTest extends ApiTestCase
{
    public function testListDeniedForRegularUser(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson('GET', '/api/system/backups', token: self::TEST_USER_TOKEN);

        self::assertResponseStatusCodeSame(403);
    }

    public function testListAllowedForAdmin(): void
    {
        $this->createUser(
            role: User::ROLE_ADMIN,
            apiToken: self::TEST_ADMIN_TOKEN,
            email: self::TEST_ADMIN_EMAIL,
            password: self::TEST_ADMIN_PASSWORD,
        );

        $this->requestJson('GET', '/api/system/backups', token: self::TEST_ADMIN_TOKEN);

        $data = $this->assertJsonResponse(200);
        self::assertIsArray($data);
    }
}
