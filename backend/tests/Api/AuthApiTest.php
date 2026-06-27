<?php

declare(strict_types=1);

namespace App\Tests\Api;

use App\Tests\Support\ApiTestCase;

final class AuthApiTest extends ApiTestCase
{
    public function testLoginWithoutCredentialsReturns400(): void
    {
        $this->requestJson('POST', '/api/auth/login', []);

        $data = $this->assertJsonResponse(400);
        self::assertFalse($data['success']);
    }

    public function testLoginWithWrongPasswordReturns401(): void
    {
        $this->createUser();

        $this->requestJson('POST', '/api/auth/login', [
            'email'    => self::TEST_USER_EMAIL,
            'password' => 'wrong-password',
        ]);

        $data = $this->assertJsonResponse(401);
        self::assertFalse($data['success']);
    }

    public function testLoginWithValidCredentialsReturnsToken(): void
    {
        $this->createUser();

        $this->requestJson('POST', '/api/auth/login', [
            'email'    => self::TEST_USER_EMAIL,
            'password' => self::TEST_USER_PASSWORD,
        ]);

        $data = $this->assertJsonResponse(200);
        self::assertTrue($data['success']);
        self::assertNotEmpty($data['token']);
        self::assertSame(self::TEST_USER_EMAIL, $data['user']['email'] ?? null);
    }

    public function testMeWithTokenReturnsUser(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson('GET', '/api/auth/me', token: self::TEST_USER_TOKEN);

        $data = $this->assertJsonResponse(200);
        self::assertSame(self::TEST_USER_EMAIL, $data['user']['email'] ?? null);
    }

    public function testMeWithoutTokenReturns401(): void
    {
        $this->requestJson('GET', '/api/auth/me');

        $this->assertJsonResponse(401);
    }

    public function testLoginTwiceCreatesIndependentTokens(): void
    {
        $this->createUser();

        $this->requestJson('POST', '/api/auth/login', [
            'email'       => self::TEST_USER_EMAIL,
            'password'    => self::TEST_USER_PASSWORD,
            'clientName'  => 'web',
        ]);
        $web = $this->assertJsonResponse(200);

        $this->requestJson('POST', '/api/auth/login', [
            'email'       => self::TEST_USER_EMAIL,
            'password'    => self::TEST_USER_PASSWORD,
            'clientName'  => 'mobile',
        ]);
        $mobile = $this->assertJsonResponse(200);

        self::assertNotSame($web['token'], $mobile['token']);

        $this->requestJson('GET', '/api/auth/me', token: $web['token']);
        $this->assertJsonResponse(200);

        $this->requestJson('GET', '/api/auth/me', token: $mobile['token']);
        $this->assertJsonResponse(200);
    }

    public function testLogoutRevokesOnlyCurrentToken(): void
    {
        $this->createUser();

        $this->requestJson('POST', '/api/auth/login', [
            'email'    => self::TEST_USER_EMAIL,
            'password' => self::TEST_USER_PASSWORD,
        ]);
        $first = $this->assertJsonResponse(200);

        $this->requestJson('POST', '/api/auth/login', [
            'email'    => self::TEST_USER_EMAIL,
            'password' => self::TEST_USER_PASSWORD,
        ]);
        $second = $this->assertJsonResponse(200);

        $this->requestJson('POST', '/api/auth/logout', token: $first['token']);
        $this->assertJsonResponse(200);

        $this->requestJson('GET', '/api/auth/me', token: $first['token']);
        $this->assertJsonResponse(401);

        $this->requestJson('GET', '/api/auth/me', token: $second['token']);
        $this->assertJsonResponse(200);
    }
}
