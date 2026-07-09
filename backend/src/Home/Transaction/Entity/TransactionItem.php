<?php

namespace App\Home\Transaction\Entity;

use App\Home\Configuration\General\Entity\Category;
use App\Home\Configuration\General\Entity\Concern;
use App\Home\Configuration\General\Entity\Wallet;
use App\Home\Transaction\Repository\TransactionItemRepository;
use App\Identity\Entity\User;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: TransactionItemRepository::class)]
#[ORM\Table(name: 'transaction_items', indexes: [
    new ORM\Index(name: 'idx_transaction_item_transaction', columns: ['transaction_id']),
    new ORM\Index(name: 'idx_transaction_item_wallet',      columns: ['wallet_id']),
    new ORM\Index(name: 'idx_transaction_item_concern',     columns: ['concern_id']),
    new ORM\Index(name: 'idx_transaction_item_category',    columns: ['category_id']),
    new ORM\Index(name: 'fk_transaction_item_created_by',  columns: ['created_by']),
    new ORM\Index(name: 'fk_transaction_item_updated_by',  columns: ['updated_by']),
])]
#[ORM\HasLifecycleCallbacks]
class TransactionItem
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Transaction::class, inversedBy: 'items')]
    #[ORM\JoinColumn(name: 'transaction_id', nullable: false, onDelete: 'CASCADE')]
    private ?Transaction $transaction = null;

    #[ORM\Column(name: 'amount_minor')]
    private int $amountMinor = 0;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $description = null;

    #[ORM\ManyToOne(targetEntity: Wallet::class)]
    #[ORM\JoinColumn(name: 'wallet_id', nullable: true, onDelete: 'SET NULL')]
    private ?Wallet $wallet = null;

    #[ORM\ManyToOne(targetEntity: Concern::class)]
    #[ORM\JoinColumn(name: 'concern_id', nullable: true, onDelete: 'SET NULL')]
    private ?Concern $concern = null;

    #[ORM\ManyToOne(targetEntity: Category::class)]
    #[ORM\JoinColumn(name: 'category_id', nullable: true, onDelete: 'SET NULL')]
    private ?Category $category = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'created_by', nullable: false)]
    private ?User $createdBy = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'updated_by', nullable: true, onDelete: 'SET NULL')]
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
            'amount'      => round($this->amountMinor / 100, 2),
            'description' => $this->description,
            'walletId'    => $this->wallet?->getId(),
            'wallet'      => $this->wallet?->getName(),
            'concernId'   => $this->concern?->getId(),
            'concern'     => $this->concern?->getName(),
            'categoryId'  => $this->category?->getId(),
            'category'    => $this->category?->getName(),
        ];
    }

    public function getId(): ?int { return $this->id; }

    public function getTransaction(): ?Transaction { return $this->transaction; }
    public function setTransaction(?Transaction $v): static { $this->transaction = $v; return $this; }

    public function getAmountMinor(): int { return $this->amountMinor; }
    public function setAmountMinor(int $v): static { $this->amountMinor = $v; return $this; }

    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $v): static { $this->description = $v; return $this; }

    public function getWallet(): ?Wallet { return $this->wallet; }
    public function setWallet(?Wallet $v): static { $this->wallet = $v; return $this; }

    public function getConcern(): ?Concern { return $this->concern; }
    public function setConcern(?Concern $v): static { $this->concern = $v; return $this; }

    public function getCategory(): ?Category { return $this->category; }
    public function setCategory(?Category $v): static { $this->category = $v; return $this; }

    public function getCreatedBy(): ?User { return $this->createdBy; }
    public function setCreatedBy(User $u): static { $this->createdBy = $u; return $this; }

    public function getUpdatedBy(): ?User { return $this->updatedBy; }
    public function setUpdatedBy(?User $u): static { $this->updatedBy = $u; return $this; }

    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): ?\DateTimeImmutable { return $this->updatedAt; }
}
