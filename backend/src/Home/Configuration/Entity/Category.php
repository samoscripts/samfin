<?php

namespace App\Home\Configuration\Entity;

use App\Home\Configuration\Repository\CategoryRepository;
use App\Identity\Entity\User;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CategoryRepository::class)]
#[ORM\Table(name: 'category')]
#[ORM\HasLifecycleCallbacks]
class Category
{
    public const DIRECTION_INCOME  = 'INCOME';
    public const DIRECTION_EXPENSE = 'EXPENSE';
    public const DIRECTIONS = [self::DIRECTION_INCOME, self::DIRECTION_EXPENSE];

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 200)]
    private ?string $name = null;

    #[ORM\Column(name: 'direction_expense', options: ['default' => true])]
    private bool $directionExpense = true;

    #[ORM\Column(name: 'direction_income', options: ['default' => false])]
    private bool $directionIncome = false;

    #[ORM\ManyToOne(targetEntity: self::class)]
    #[ORM\JoinColumn(name: 'parent_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?self $parent = null;

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
            'id'          => $this->id,
            'parentId'    => $this->parent?->getId(),
            'parentName'  => $this->parent?->getName(),
            'name'        => $this->name,
            'directions'  => $this->getDirections(),
            'description' => $this->description,
            'active'      => $this->active,
            'createdById' => $this->createdBy?->getId(),
            'updatedById' => $this->updatedBy?->getId(),
            'createdAt'   => $this->createdAt?->format('Y-m-d\TH:i:s\Z'),
            'updatedAt'   => $this->updatedAt?->format('Y-m-d\TH:i:s\Z'),
        ];
    }

    /** @return list<string> */
    public function getDirections(): array
    {
        $directions = [];
        if ($this->directionExpense) {
            $directions[] = self::DIRECTION_EXPENSE;
        }
        if ($this->directionIncome) {
            $directions[] = self::DIRECTION_INCOME;
        }

        return $directions;
    }

    public function supportsDirection(string $direction): bool
    {
        return match ($direction) {
            self::DIRECTION_EXPENSE => $this->directionExpense,
            self::DIRECTION_INCOME  => $this->directionIncome,
            default                 => false,
        };
    }

    /** @param list<string> $directions */
    public function setDirections(array $directions): static
    {
        $normalized = array_values(array_unique(array_filter(
            $directions,
            fn (string $direction) => in_array($direction, self::DIRECTIONS, true),
        )));

        $this->directionExpense = in_array(self::DIRECTION_EXPENSE, $normalized, true);
        $this->directionIncome  = in_array(self::DIRECTION_INCOME, $normalized, true);

        return $this;
    }

    /** @param list<string> $childDirections */
    public function supportsAllDirections(array $childDirections): bool
    {
        foreach ($childDirections as $direction) {
            if (!$this->supportsDirection($direction)) {
                return false;
            }
        }

        return true;
    }

    public function hasAnyDirection(): bool
    {
        return $this->directionExpense || $this->directionIncome;
    }

    public function getId(): ?int { return $this->id; }

    public function getName(): ?string { return $this->name; }
    public function setName(string $name): static { $this->name = $name; return $this; }

    public function isDirectionExpense(): bool { return $this->directionExpense; }
    public function setDirectionExpense(bool $directionExpense): static { $this->directionExpense = $directionExpense; return $this; }

    public function isDirectionIncome(): bool { return $this->directionIncome; }
    public function setDirectionIncome(bool $directionIncome): static { $this->directionIncome = $directionIncome; return $this; }

    public function getParent(): ?self { return $this->parent; }
    public function setParent(?self $parent): static { $this->parent = $parent; return $this; }

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
