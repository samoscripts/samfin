<?php

namespace App\Home\Configuration\Entity;

use App\Home\Configuration\Repository\PartyRepository;
use App\Identity\Entity\User;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: PartyRepository::class)]
#[ORM\Table(name: 'party')]
#[ORM\HasLifecycleCallbacks]
class Party
{
    public const TYPE_PERSON      = 'PERSON';
    public const TYPE_COMPANY     = 'COMPANY';
    public const TYPE_SHOP        = 'SHOP';
    public const TYPE_INSTITUTION = 'INSTITUTION';
    public const TYPE_ACCOUNT     = 'ACCOUNT';
    public const TYPE_CASH        = 'CASH';
    public const TYPE_OTHER       = 'OTHER';

    public const OWNERSHIP_OWN      = 'OWN';
    public const OWNERSHIP_EXTERNAL = 'EXTERNAL';

    public const TYPES      = [self::TYPE_PERSON, self::TYPE_COMPANY, self::TYPE_SHOP, self::TYPE_INSTITUTION, self::TYPE_ACCOUNT, self::TYPE_CASH, self::TYPE_OTHER];
    public const OWNERSHIPS = [self::OWNERSHIP_OWN, self::OWNERSHIP_EXTERNAL];

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 200)]
    private ?string $name = null;

    #[ORM\Column(length: 20)]
    private string $type = self::TYPE_OTHER;

    #[ORM\Column(name: 'ownership_type', length: 20)]
    private string $ownershipType = self::OWNERSHIP_EXTERNAL;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $description = null;

    #[ORM\Column]
    private bool $active = true;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'created_by', referencedColumnName: 'id', nullable: false)]
    private ?User $createdBy = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'updated_by', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?User $updatedBy = null;

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

    public function toApiArray(): array
    {
        return [
            'id'            => $this->id,
            'name'          => $this->name,
            'type'          => $this->type,
            'ownershipType' => $this->ownershipType,
            'description'   => $this->description,
            'active'        => $this->active,
            'createdById'   => $this->createdBy?->getId(),
            'updatedById'   => $this->updatedBy?->getId(),
            'createdAt'     => $this->createdAt?->format('Y-m-d\TH:i:s\Z'),
            'updatedAt'     => $this->updatedAt?->format('Y-m-d\TH:i:s\Z'),
        ];
    }

    public function getId(): ?int { return $this->id; }

    public function getName(): ?string { return $this->name; }
    public function setName(string $name): static { $this->name = $name; return $this; }

    public function getType(): string { return $this->type; }
    public function setType(string $type): static { $this->type = $type; return $this; }

    public function getOwnershipType(): string { return $this->ownershipType; }
    public function setOwnershipType(string $ownershipType): static { $this->ownershipType = $ownershipType; return $this; }

    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $description): static { $this->description = $description; return $this; }

    public function isActive(): bool { return $this->active; }
    public function setActive(bool $active): static { $this->active = $active; return $this; }

    public function getCreatedBy(): ?User { return $this->createdBy; }
    public function setCreatedBy(User $user): static { $this->createdBy = $user; return $this; }

    public function getUpdatedBy(): ?User { return $this->updatedBy; }
    public function setUpdatedBy(?User $user): static { $this->updatedBy = $user; return $this; }

    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): ?\DateTimeImmutable { return $this->updatedAt; }
}
