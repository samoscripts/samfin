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
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/users')]
#[IsGranted('ROLE_ADMIN')]
class UserController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface      $em,
        private UserRepository              $userRepository,
        private UserPasswordHasherInterface $passwordHasher,
    ) {}

    #[Route('', name: 'api_users_index', methods: ['GET'])]
    public function index(): JsonResponse
    {
        $users = $this->userRepository->findBy([], ['displayName' => 'ASC']);

        return $this->json(array_map(fn(User $u) => $u->toApiArray(), $users));
    }

    #[Route('/{id}', name: 'api_users_show', methods: ['GET'])]
    public function show(int $id): JsonResponse
    {
        $user = $this->userRepository->find($id);
        if (!$user) {
            return $this->json(['message' => 'Nie znaleziono użytkownika.'], 404);
        }

        return $this->json($user->toApiArray());
    }

    #[Route('', name: 'api_users_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];

        $email    = trim((string) ($data['email'] ?? ''));
        $password = (string) ($data['password'] ?? '');

        if (!$email) {
            return $this->json(['message' => 'Pole email jest wymagane.'], 422);
        }
        if (!$password) {
            return $this->json(['message' => 'Pole hasło jest wymagane przy tworzeniu użytkownika.'], 422);
        }
        if ($this->userRepository->findOneBy(['email' => $email])) {
            return $this->json(['message' => 'Użytkownik z tym adresem email już istnieje.'], 409);
        }

        $role = $data['role'] ?? User::ROLE_USER;
        if (!in_array($role, [User::ROLE_ADMIN, User::ROLE_USER], true)) {
            return $this->json(['message' => 'Nieprawidłowa rola.'], 422);
        }

        $user = new User();
        $user->setEmail($email);
        $user->setForename((string) ($data['forename'] ?? ''));
        $user->setSurname((string) ($data['surname'] ?? ''));
        $user->setDisplayName((string) ($data['displayName'] ?? $email));
        $user->setRole($role);
        $user->setAvatarSprite($data['avatarSprite'] ?? null);
        $user->setAvatarIndex(isset($data['avatarIndex']) ? (int) $data['avatarIndex'] : null);
        $user->setActive((bool) ($data['active'] ?? true));
        $user->setPasswordHash($this->passwordHasher->hashPassword($user, $password));

        $this->em->persist($user);
        $this->em->flush();

        return $this->json($user->toApiArray(), 201);
    }

    #[Route('/{id}', name: 'api_users_update', methods: ['PUT'])]
    public function update(int $id, Request $request): JsonResponse
    {
        $user = $this->userRepository->find($id);
        if (!$user) {
            return $this->json(['message' => 'Nie znaleziono użytkownika.'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        if (array_key_exists('email', $data)) {
            $email = trim((string) $data['email']);
            $existing = $this->userRepository->findOneBy(['email' => $email]);
            if ($existing && $existing->getId() !== $user->getId()) {
                return $this->json(['message' => 'Użytkownik z tym adresem email już istnieje.'], 409);
            }
            $user->setEmail($email);
        }

        if (array_key_exists('forename', $data))     $user->setForename((string) $data['forename']);
        if (array_key_exists('surname', $data))      $user->setSurname((string) $data['surname']);
        if (array_key_exists('displayName', $data))  $user->setDisplayName((string) $data['displayName']);
        if (array_key_exists('active', $data))       $user->setActive((bool) $data['active']);
        if (array_key_exists('avatarSprite', $data)) $user->setAvatarSprite($data['avatarSprite']);
        if (array_key_exists('avatarIndex', $data))  $user->setAvatarIndex(isset($data['avatarIndex']) ? (int) $data['avatarIndex'] : null);

        if (array_key_exists('role', $data)) {
            $role = $data['role'];
            if (!in_array($role, [User::ROLE_ADMIN, User::ROLE_USER], true)) {
                return $this->json(['message' => 'Nieprawidłowa rola.'], 422);
            }
            $user->setRole($role);
        }

        // Password change — only if newPassword provided
        if (!empty($data['newPassword'])) {
            $user->setPasswordHash($this->passwordHasher->hashPassword($user, $data['newPassword']));
            $user->setApiToken(null); // invalidate existing sessions
        }

        $this->em->flush();

        return $this->json($user->toApiArray());
    }

    /**
     * Soft delete — sets active = false.
     */
    #[Route('/{id}', name: 'api_users_delete', methods: ['DELETE'])]
    public function delete(int $id): JsonResponse
    {
        $user = $this->userRepository->find($id);
        if (!$user) {
            return $this->json(['message' => 'Nie znaleziono użytkownika.'], 404);
        }

        $user->setActive(false);
        $user->setApiToken(null);
        $this->em->flush();

        return $this->json(['message' => 'Użytkownik dezaktywowany.']);
    }
}
