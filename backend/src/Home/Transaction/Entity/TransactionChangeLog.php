<?php

namespace App\Home\Transaction\Entity;

use App\Home\Transaction\Repository\TransactionChangeLogRepository;
use App\Identity\Entity\User;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: TransactionChangeLogRepository::class)]
#[ORM\Table(name: 'transactions_change_log', indexes: [
    new ORM\Index(name: 'idx_tx_change_log_transaction', columns: ['transaction_id']),
    new ORM\Index(name: 'idx_tx_change_log_created_at', columns: ['created_at']),
])]
class TransactionChangeLog
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Transaction::class)]
    #[ORM\JoinColumn(name: 'transaction_id', nullable: false, onDelete: 'CASCADE')]
    private ?Transaction $transaction = null;

    /** @var array<string,mixed> */
    #[ORM\Column(name: 'snapshot_json', type: 'json')]
    private array $snapshotJson = [];

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'created_by', nullable: false)]
    private ?User $createdBy = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $createdAt = null;

    public function toApiArray(): array
    {
        return [
            'id'        => $this->id,
            'createdAt' => $this->createdAt?->format('Y-m-d H:i:s'),
            'createdBy' => $this->createdBy?->getDisplayName() ?? '—',
            'snapshot'  => $this->snapshotJson,
        ];
    }

    public function getId(): ?int { return $this->id; }

    public function getTransaction(): ?Transaction { return $this->transaction; }
    public function setTransaction(Transaction $tx): static { $this->transaction = $tx; return $this; }

    /** @return array<string,mixed> */
    public function getSnapshotJson(): array { return $this->snapshotJson; }

    /** @param array<string,mixed> $snapshot */
    public function setSnapshotJson(array $snapshot): static { $this->snapshotJson = $snapshot; return $this; }

    public function getCreatedBy(): ?User { return $this->createdBy; }
    public function setCreatedBy(User $user): static { $this->createdBy = $user; return $this; }

    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }
    public function setCreatedAt(\DateTimeImmutable $at): static { $this->createdAt = $at; return $this; }
}
