<?php

namespace App\Identity\Entity;

use App\Identity\Repository\UserRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\Table(name: 'app_user')]
#[ORM\HasLifecycleCallbacks]
class User implements UserInterface, PasswordAuthenticatedUserInterface
{
    public const ROLE_ADMIN = 'ADMIN';
    public const ROLE_USER  = 'USER';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 180, unique: true)]
    private ?string $email = null;

    #[ORM\Column(name: 'password_hash', length: 255)]
    private ?string $passwordHash = null;

    #[ORM\Column(length: 100)]
    private ?string $forename = null;

    #[ORM\Column(length: 100)]
    private ?string $surname = null;

    #[ORM\Column(length: 100)]
    private ?string $displayName = null;

    #[ORM\Column(length: 20)]
    private string $role = self::ROLE_USER;

    #[ORM\Column(length: 100, nullable: true)]
    private ?string $avatarSprite = null;

    #[ORM\Column(nullable: true)]
    private ?int $avatarIndex = null;

    #[ORM\Column]
    private bool $active = true;

    #[ORM\Column(length: 64, unique: true, nullable: true)]
    private ?string $apiToken = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $updatedAt = null;

    #[ORM\PrePersist]
    public function prePersist(): void
    {
        $now = new \DateTimeImmutable();
        $this->createdAt = $now;
        $this->updatedAt = $now;
    }

    #[ORM\PreUpdate]
    public function preUpdate(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getUserIdentifier(): string
    {
        return (string) $this->email;
    }

    public function getRoles(): array
    {
        return $this->role === self::ROLE_ADMIN
            ? ['ROLE_ADMIN', 'ROLE_USER']
            : ['ROLE_USER'];
    }

    public function getPassword(): ?string
    {
        return $this->passwordHash;
    }

    public function eraseCredentials(): void {}

    public function toApiArray(): array
    {
        return [
            'id'           => $this->id,
            'email'        => $this->email,
            'forename'     => $this->forename,
            'surname'      => $this->surname,
            'displayName'  => $this->displayName,
            'role'         => $this->role,
            'avatarSprite' => $this->avatarSprite,
            'avatarIndex'  => $this->avatarIndex,
            'active'       => $this->active,
            'createdAt'    => $this->createdAt?->format('Y-m-d\TH:i:s\Z'),
            'updatedAt'    => $this->updatedAt?->format('Y-m-d\TH:i:s\Z'),
        ];
    }

    public function getId(): ?int { return $this->id; }

    public function getEmail(): ?string { return $this->email; }
    public function setEmail(string $email): static { $this->email = $email; return $this; }

    public function getPasswordHash(): ?string { return $this->passwordHash; }
    public function setPasswordHash(string $hash): static { $this->passwordHash = $hash; return $this; }

    public function getForename(): ?string { return $this->forename; }
    public function setForename(string $forename): static { $this->forename = $forename; return $this; }

    public function getSurname(): ?string { return $this->surname; }
    public function setSurname(string $surname): static { $this->surname = $surname; return $this; }

    public function getDisplayName(): ?string { return $this->displayName; }
    public function setDisplayName(string $displayName): static { $this->displayName = $displayName; return $this; }

    public function getRole(): string { return $this->role; }
    public function setRole(string $role): static { $this->role = $role; return $this; }

    public function getAvatarSprite(): ?string { return $this->avatarSprite; }
    public function setAvatarSprite(?string $avatarSprite): static { $this->avatarSprite = $avatarSprite; return $this; }

    public function getAvatarIndex(): ?int { return $this->avatarIndex; }
    public function setAvatarIndex(?int $avatarIndex): static { $this->avatarIndex = $avatarIndex; return $this; }

    public function isActive(): bool { return $this->active; }
    public function setActive(bool $active): static { $this->active = $active; return $this; }

    public function getApiToken(): ?string { return $this->apiToken; }
    public function setApiToken(?string $apiToken): static { $this->apiToken = $apiToken; return $this; }

    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): ?\DateTimeImmutable { return $this->updatedAt; }
}
