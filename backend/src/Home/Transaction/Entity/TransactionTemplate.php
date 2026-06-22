<?php

namespace App\Home\Transaction\Entity;

use App\Home\Configuration\Entity\Category;
use App\Home\Configuration\Entity\Concern;
use App\Home\Configuration\Entity\Party;
use App\Home\Configuration\Entity\Wallet;
use App\Home\Transaction\Repository\TransactionTemplateRepository;
use App\Identity\Entity\User;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: TransactionTemplateRepository::class)]
#[ORM\Table(name: 'transaction_template', uniqueConstraints: [
    new ORM\UniqueConstraint(name: 'uniq_transaction_template_user_direction_name', columns: ['user_id', 'direction', 'name']),
])]
#[ORM\HasLifecycleCallbacks]
class TransactionTemplate
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'user_id', nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    #[ORM\Column(length: 200)]
    private string $name = '';

    #[ORM\Column(length: 10)]
    private string $direction = Transaction::DIRECTION_EXPENSE;

    #[ORM\ManyToOne(targetEntity: Party::class)]
    #[ORM\JoinColumn(name: 'paid_from_party_id', nullable: true, onDelete: 'SET NULL')]
    private ?Party $paidFromParty = null;

    #[ORM\ManyToOne(targetEntity: Party::class)]
    #[ORM\JoinColumn(name: 'paid_to_party_id', nullable: true, onDelete: 'SET NULL')]
    private ?Party $paidToParty = null;

    #[ORM\ManyToOne(targetEntity: Wallet::class)]
    #[ORM\JoinColumn(name: 'wallet_id', nullable: true, onDelete: 'SET NULL')]
    private ?Wallet $wallet = null;

    #[ORM\ManyToOne(targetEntity: Concern::class)]
    #[ORM\JoinColumn(name: 'concern_id', nullable: true, onDelete: 'SET NULL')]
    private ?Concern $concern = null;

    #[ORM\ManyToOne(targetEntity: Category::class)]
    #[ORM\JoinColumn(name: 'category_id', nullable: true, onDelete: 'SET NULL')]
    private ?Category $category = null;

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
            'id'               => $this->id,
            'name'             => $this->name,
            'direction'        => $this->direction,
            'paidFromPartyId'  => $this->paidFromParty?->getId(),
            'paidToPartyId'    => $this->paidToParty?->getId(),
            'walletId'         => $this->wallet?->getId(),
            'concernId'        => $this->concern?->getId(),
            'categoryId'       => $this->category?->getId(),
            'createdAt'        => $this->createdAt?->format('Y-m-d\TH:i:s\Z'),
            'updatedAt'        => $this->updatedAt?->format('Y-m-d\TH:i:s\Z'),
        ];
    }

    public function getId(): ?int { return $this->id; }

    public function getUser(): ?User { return $this->user; }
    public function setUser(User $user): static { $this->user = $user; return $this; }

    public function getName(): string { return $this->name; }
    public function setName(string $name): static { $this->name = $name; return $this; }

    public function getDirection(): string { return $this->direction; }
    public function setDirection(string $direction): static { $this->direction = $direction; return $this; }

    public function getPaidFromParty(): ?Party { return $this->paidFromParty; }
    public function setPaidFromParty(?Party $party): static { $this->paidFromParty = $party; return $this; }

    public function getPaidToParty(): ?Party { return $this->paidToParty; }
    public function setPaidToParty(?Party $party): static { $this->paidToParty = $party; return $this; }

    public function getWallet(): ?Wallet { return $this->wallet; }
    public function setWallet(?Wallet $wallet): static { $this->wallet = $wallet; return $this; }

    public function getConcern(): ?Concern { return $this->concern; }
    public function setConcern(?Concern $concern): static { $this->concern = $concern; return $this; }

    public function getCategory(): ?Category { return $this->category; }
    public function setCategory(?Category $category): static { $this->category = $category; return $this; }

    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): ?\DateTimeImmutable { return $this->updatedAt; }
}
