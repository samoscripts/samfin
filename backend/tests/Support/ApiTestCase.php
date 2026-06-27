<?php

declare(strict_types=1);

namespace App\Tests\Support;

use App\Identity\Entity\User;
use App\Identity\Entity\UserApiToken;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

abstract class ApiTestCase extends WebTestCase
{
    protected const TEST_USER_EMAIL    = 'test-user@samfin.local';
    protected const TEST_USER_PASSWORD = 'test-password';
    protected const TEST_USER_TOKEN    = 'test-token-user';

    protected const TEST_ADMIN_EMAIL    = 'test-admin@samfin.local';
    protected const TEST_ADMIN_PASSWORD = 'test-admin-password';
    protected const TEST_ADMIN_TOKEN    = 'test-token-admin';

    protected KernelBrowser $client;

    protected function setUp(): void
    {
        $this->client = static::createClient();
    }

    protected function createUser(
        string $role = User::ROLE_USER,
        ?string $apiToken = null,
        string $email = self::TEST_USER_EMAIL,
        string $password = self::TEST_USER_PASSWORD,
    ): User {
        /** @var EntityManagerInterface $em */
        $em = static::getContainer()->get(EntityManagerInterface::class);
        /** @var UserPasswordHasherInterface $hasher */
        $hasher = static::getContainer()->get(UserPasswordHasherInterface::class);

        $user = new User();
        $user->setEmail($email);
        $user->setForename('Test');
        $user->setSurname('User');
        $user->setDisplayName('Test User');
        $user->setRole($role);
        $user->setActive(true);
        $user->setPasswordHash($hasher->hashPassword($user, $password));

        if ($apiToken !== null) {
            $em->persist(new UserApiToken($user, $apiToken, 'test'));
        }

        $em->persist($user);
        $em->flush();

        return $user;
    }

  /**
   * @param array<string, mixed>|null $body
   */
    protected function requestJson(
        string $method,
        string $uri,
        ?array $body = null,
        ?string $token = null,
    ): void {
        $server = ['CONTENT_TYPE' => 'application/json'];

        if ($token !== null) {
            $server['HTTP_Authorization'] = 'Bearer ' . $token;
        }

        $content = $body !== null ? json_encode($body, JSON_THROW_ON_ERROR) : null;

        $this->client->request($method, $uri, server: $server, content: $content);
    }

    /**
     * @return array<string, mixed>|list<mixed>
     */
    protected function assertJsonResponse(int $status): array
    {
        self::assertResponseStatusCodeSame($status);

        $decoded = json_decode($this->client->getResponse()->getContent(), true);
        self::assertIsArray($decoded);

        return $decoded;
    }
}
