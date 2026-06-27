<?php

namespace App\Identity\Service;

use App\Identity\Entity\User;
use App\Identity\Entity\UserApiToken;
use App\Identity\Repository\UserApiTokenRepository;
use Doctrine\ORM\EntityManagerInterface;

class ApiTokenService
{
    private const DEFAULT_CLIENT_NAME = 'web';
    private const MAX_CLIENT_NAME_LENGTH = 64;

    public function __construct(
        private EntityManagerInterface $em,
        private UserApiTokenRepository $tokenRepository,
    ) {}

    public function issueToken(User $user, ?string $clientName = null): string
    {
        $token = bin2hex(random_bytes(32));
        $name  = $this->normalizeClientName($clientName);

        $this->em->persist(new UserApiToken($user, $token, $name));
        $this->em->flush();

        return $token;
    }

    public function findUserByToken(string $token): ?User
    {
        $row = $this->tokenRepository->findOneByToken($token);

        return $row?->getUser();
    }

    public function touchToken(string $token): void
    {
        $row = $this->tokenRepository->findOneByToken($token);
        if ($row === null) {
            return;
        }

        $row->touchLastUsed();
        $this->em->flush();
    }

    public function revokeToken(string $token): void
    {
        $row = $this->tokenRepository->findOneByToken($token);
        if ($row === null) {
            return;
        }

        $this->em->remove($row);
        $this->em->flush();
    }

    public function revokeAllForUser(User $user): void
    {
        $this->tokenRepository->deleteAllForUser($user);
    }

    private function normalizeClientName(?string $clientName): string
    {
        $name = trim((string) $clientName);
        if ($name === '') {
            $name = self::DEFAULT_CLIENT_NAME;
        }

        if (mb_strlen($name) > self::MAX_CLIENT_NAME_LENGTH) {
            $name = mb_substr($name, 0, self::MAX_CLIENT_NAME_LENGTH);
        }

        return $name;
    }
}
