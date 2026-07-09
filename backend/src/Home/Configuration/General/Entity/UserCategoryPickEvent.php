<?php

namespace App\Home\Configuration\General\Entity;

use App\Home\Configuration\General\Repository\UserCategoryPickEventRepository;
use App\Home\Transaction\Entity\Transaction;
use App\Identity\Entity\User;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: UserCategoryPickEventRepository::class)]
#[ORM\Table(name: 'user_category_pick_event')]
#[ORM\Index(name: 'idx_ucpe_user_direction_created', columns: ['user_id', 'direction', 'created_at'])]
#[ORM\Index(name: 'idx_ucpe_user_category_direction', columns: ['user_id', 'category_id', 'direction'])]
#[ORM\HasLifecycleCallbacks]
class UserCategoryPickEvent
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'user_id', nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    #[ORM\ManyToOne(targetEntity: Category::class)]
    #[ORM\JoinColumn(name: 'category_id', nullable: false, onDelete: 'CASCADE')]
    private ?Category $category = null;

    #[ORM\Column(length: 10)]
    private string $direction = Transaction::DIRECTION_EXPENSE;

    #[ORM\Column]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\PrePersist]
    public function prePersist(): void
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(User $user): static
    {
        $this->user = $user;

        return $this;
    }

    public function getCategory(): ?Category
    {
        return $this->category;
    }

    public function setCategory(Category $category): static
    {
        $this->category = $category;

        return $this;
    }

    public function getDirection(): string
    {
        return $this->direction;
    }

    public function setDirection(string $direction): static
    {
        $this->direction = $direction;

        return $this;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->createdAt;
    }
}
