<?php

namespace App\Home\Transaction\Entity;

use App\Home\Transaction\Repository\TransactionTrashRepository;
use App\Identity\Entity\User;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: TransactionTrashRepository::class)]
#[ORM\Table(name: 'transactions_trash', indexes: [
    new ORM\Index(name: 'idx_transactions_trash_deleted_at', columns: ['deleted_at']),
    new ORM\Index(name: 'idx_transactions_trash_original_id', columns: ['original_transaction_id']),
])]
class TransactionTrash
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(name: 'original_transaction_id')]
    private int $originalTransactionId = 0;

    /** @var array<string, mixed> */
    #[ORM\Column(name: 'snapshot_json', type: 'json')]
    private array $snapshotJson = [];

    #[ORM\Column(name: 'deleted_at')]
    private ?\DateTimeImmutable $deletedAt = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'deleted_by', nullable: false)]
    private ?User $deletedBy = null;

    public function getId(): ?int { return $this->id; }

    public function getOriginalTransactionId(): int { return $this->originalTransactionId; }
    public function setOriginalTransactionId(int $id): static { $this->originalTransactionId = $id; return $this; }

    /** @return array<string, mixed> */
    public function getSnapshotJson(): array { return $this->snapshotJson; }

    /** @param array<string, mixed> $snapshot */
    public function setSnapshotJson(array $snapshot): static { $this->snapshotJson = $snapshot; return $this; }

    public function getDeletedAt(): ?\DateTimeImmutable { return $this->deletedAt; }
    public function setDeletedAt(\DateTimeImmutable $at): static { $this->deletedAt = $at; return $this; }

    public function getDeletedBy(): ?User { return $this->deletedBy; }
    public function setDeletedBy(User $user): static { $this->deletedBy = $user; return $this; }
}
