<?php

namespace App\Controller;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

#[Route('/api/auth')]
class AuthController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface       $em,
        private UserPasswordHasherInterface  $passwordHasher,
        private UserRepository               $userRepository,
    ) {}

    /**
     * Public — returns minimal user data for login tiles.
     */
    #[Route('/login-options', name: 'api_auth_login_options', methods: ['GET'])]
    public function loginOptions(): JsonResponse
    {
        $users = $this->userRepository->findBy(['active' => true], ['displayName' => 'ASC']);

        $data = array_map(static fn(User $u) => [
            'id'          => $u->getId(),
            'email'       => $u->getEmail(),
            'displayName' => $u->getDisplayName(),
            'avatarSprite'=> $u->getAvatarSprite(),
            'avatarIndex' => $u->getAvatarIndex(),
        ], $users);

        return $this->json($data);
    }

    /**
     * Public — authenticates and returns a Bearer token.
     */
    #[Route('/login', name: 'api_auth_login', methods: ['POST'])]
    public function login(Request $request): JsonResponse
    {
        $data     = json_decode($request->getContent(), true) ?? [];
        $email    = trim((string) ($data['email'] ?? ''));
        $password = (string) ($data['password'] ?? '');

        if (!$email || !$password) {
            return $this->json(['success' => false, 'message' => 'Podaj email i hasło.'], 400);
        }

        $user = $this->userRepository->findOneBy(['email' => $email]);

        if (!$user || !$user->isActive() || !$this->passwordHasher->isPasswordValid($user, $password)) {
            return $this->json(['success' => false, 'message' => 'Nieprawidłowy email lub hasło.'], 401);
        }

        $token = bin2hex(random_bytes(32));
        $user->setApiToken($token);
        $this->em->flush();

        return $this->json([
            'success' => true,
            'token'   => $token,
            'user'    => $user->toApiArray(),
        ]);
    }

    /**
     * Protected — returns the current user's data.
     */
    #[Route('/me', name: 'api_auth_me', methods: ['GET'])]
    public function me(#[CurrentUser] ?User $user): JsonResponse
    {
        if (!$user) {
            return $this->json(['message' => 'Nie zalogowano.'], 401);
        }

        return $this->json(['user' => $user->toApiArray()]);
    }

    /**
     * Protected — self profile update.
     * Allowed fields: forename, surname, displayName, avatarSprite, avatarIndex.
     * Password change requires currentPassword + newPassword.
     */
    #[Route('/me', name: 'api_auth_me_update', methods: ['PUT'])]
    public function updateMe(#[CurrentUser] ?User $user, Request $request): JsonResponse
    {
        if (!$user) {
            return $this->json(['message' => 'Nie zalogowano.'], 401);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        // Explicitly block self-escalation / self-deactivation via this endpoint.
        if (array_key_exists('role', $data) || array_key_exists('active', $data)) {
            return $this->json(['message' => 'Zmiana roli lub statusu konta jest niedozwolona.'], 403);
        }

        if (array_key_exists('email', $data) && trim((string) $data['email']) !== (string) $user->getEmail()) {
            return $this->json(['message' => 'Zmiana emaila w tym widoku jest niedozwolona.'], 403);
        }

        if (array_key_exists('forename', $data))     $user->setForename((string) $data['forename']);
        if (array_key_exists('surname', $data))      $user->setSurname((string) $data['surname']);
        if (array_key_exists('displayName', $data))  $user->setDisplayName((string) $data['displayName']);
        if (array_key_exists('avatarSprite', $data)) $user->setAvatarSprite($data['avatarSprite']);
        if (array_key_exists('avatarIndex', $data))  $user->setAvatarIndex(isset($data['avatarIndex']) ? (int) $data['avatarIndex'] : null);

        $newPassword = (string) ($data['newPassword'] ?? '');
        if ($newPassword !== '') {
            $currentPassword = (string) ($data['currentPassword'] ?? '');
            if ($currentPassword === '') {
                return $this->json(['message' => 'Podaj aktualne hasło.'], 422);
            }
            if (!$this->passwordHasher->isPasswordValid($user, $currentPassword)) {
                return $this->json(['message' => 'Aktualne hasło jest nieprawidłowe.'], 422);
            }
            $user->setPasswordHash($this->passwordHasher->hashPassword($user, $newPassword));
        }

        $this->em->flush();

        return $this->json(['user' => $user->toApiArray()]);
    }

    /**
     * Protected — invalidates the token.
     */
    #[Route('/logout', name: 'api_auth_logout', methods: ['POST'])]
    public function logout(#[CurrentUser] User $user): JsonResponse
    {
        $user->setApiToken(null);
        $this->em->flush();

        return $this->json(['success' => true, 'message' => 'Wylogowano.']);
    }
}
