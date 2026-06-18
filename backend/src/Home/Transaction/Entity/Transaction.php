<?php

namespace App\Home\Transaction\Entity;

use App\Home\Configuration\Entity\Party;
use App\Home\Import\Entity\CsvImport;
use App\Home\Import\Entity\CsvImportRow;
use App\Home\Transaction\Repository\TransactionRepository;
use App\Identity\Entity\User;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: TransactionRepository::class)]
#[ORM\Table(name: 'transactions', indexes: [
    new ORM\Index(name: 'idx_transaction_operation_date', columns: ['operation_date']),
    new ORM\Index(name: 'idx_transaction_status',         columns: ['status']),
    new ORM\Index(name: 'idx_transaction_direction',      columns: ['direction']),
    new ORM\Index(name: 'idx_transaction_import',         columns: ['import_id']),
    new ORM\Index(name: 'idx_transaction_paid_from_party',columns: ['paid_from_party_id']),
    new ORM\Index(name: 'idx_transaction_paid_to_party',  columns: ['paid_to_party_id']),
    new ORM\Index(name: 'fk_transaction_created_by',      columns: ['created_by']),
    new ORM\Index(name: 'fk_transaction_updated_by',      columns: ['updated_by']),
], uniqueConstraints: [
    new ORM\UniqueConstraint(name: 'uniq_transaction_import_row', columns: ['import_row_id']),
])]
#[ORM\HasLifecycleCallbacks]
class Transaction
{
    public const DIRECTION_INCOME  = 'INCOME';
    public const DIRECTION_EXPENSE = 'EXPENSE';

    public const STATUS_UNCLASSIFIED         = 'UNCLASSIFIED';
    public const STATUS_PARTIALLY_CLASSIFIED = 'PARTIALLY_CLASSIFIED';
    public const STATUS_CLASSIFIED           = 'CLASSIFIED';

    public const SOURCE_CSV    = 'CSV';
    public const SOURCE_MANUAL = 'MANUAL';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: CsvImport::class)]
    #[ORM\JoinColumn(name: 'import_id', nullable: true, onDelete: 'SET NULL')]
    private ?CsvImport $import = null;

    #[ORM\OneToOne(targetEntity: CsvImportRow::class)]
    #[ORM\JoinColumn(name: 'import_row_id', nullable: true, onDelete: 'SET NULL')]
    private ?CsvImportRow $importRow = null;

    #[ORM\Column(name: 'operation_date', type: 'date_immutable')]
    private ?\DateTimeImmutable $operationDate = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $description = null;

    #[ORM\Column(name: 'amount_minor')]
    private int $amountMinor = 0;

    #[ORM\Column(length: 10)]
    private string $direction = self::DIRECTION_EXPENSE;

    #[ORM\Column(length: 25)]
    private string $status = self::STATUS_UNCLASSIFIED;

    #[ORM\ManyToOne(targetEntity: Party::class)]
    #[ORM\JoinColumn(name: 'paid_from_party_id', nullable: true, onDelete: 'SET NULL')]
    private ?Party $paidFromParty = null;

    #[ORM\ManyToOne(targetEntity: Party::class)]
    #[ORM\JoinColumn(name: 'paid_to_party_id', nullable: true, onDelete: 'SET NULL')]
    private ?Party $paidToParty = null;

    #[ORM\Column(length: 30)]
    private string $source = self::SOURCE_CSV;

    #[ORM\Column(name: 'counterparty_account_number', length: 26, nullable: true)]
    private ?string $counterpartyAccountNumber = null;

    /** @var Collection<int, TransactionItem> */
    #[ORM\OneToMany(
        targetEntity: TransactionItem::class,
        mappedBy: 'transaction',
        cascade: ['persist', 'remove'],
        orphanRemoval: true,
    )]
    private Collection $items;

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

    public function __construct()
    {
        $this->items = new ArrayCollection();
    }

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
            'transactionId'    => $this->id,
            'date'             => $this->operationDate?->format('Y-m-d'),
            'description'      => $this->description,
            'amount'           => round($this->amountMinor / 100, 2),
            'direction'        => $this->direction,
            'status'           => $this->status,
            'paidFromPartyId'  => $this->paidFromParty?->getId(),
            'paidFrom'         => $this->paidFromParty?->getName(),
            'paidToPartyId'    => $this->paidToParty?->getId(),
            'paidTo'           => $this->paidToParty?->getName(),
            'source'           => $this->source,
            'counterpartyAccountNumber' => $this->counterpartyAccountNumber,
            'items'            => array_values(array_map(
                fn(TransactionItem $i) => $i->toApiArray(),
                $this->items->toArray(),
            )),
        ];
    }

    public function getId(): ?int { return $this->id; }

    public function getImport(): ?CsvImport { return $this->import; }
    public function setImport(?CsvImport $v): static { $this->import = $v; return $this; }

    public function getImportRow(): ?CsvImportRow { return $this->importRow; }
    public function setImportRow(?CsvImportRow $v): static { $this->importRow = $v; return $this; }

    public function getOperationDate(): ?\DateTimeImmutable { return $this->operationDate; }
    public function setOperationDate(?\DateTimeImmutable $v): static { $this->operationDate = $v; return $this; }

    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $v): static { $this->description = $v; return $this; }

    public function getAmountMinor(): int { return $this->amountMinor; }
    public function setAmountMinor(int $v): static { $this->amountMinor = $v; return $this; }

    public function getDirection(): string { return $this->direction; }
    public function setDirection(string $v): static { $this->direction = $v; return $this; }

    public function getStatus(): string { return $this->status; }
    public function setStatus(string $v): static { $this->status = $v; return $this; }

    public function getPaidFromParty(): ?Party { return $this->paidFromParty; }
    public function setPaidFromParty(?Party $v): static { $this->paidFromParty = $v; return $this; }

    public function getPaidToParty(): ?Party { return $this->paidToParty; }
    public function setPaidToParty(?Party $v): static { $this->paidToParty = $v; return $this; }

    public function getSource(): string { return $this->source; }
    public function setSource(string $v): static { $this->source = $v; return $this; }

    public function getCounterpartyAccountNumber(): ?string { return $this->counterpartyAccountNumber; }
    public function setCounterpartyAccountNumber(?string $v): static { $this->counterpartyAccountNumber = $v; return $this; }

    /** @return Collection<int, TransactionItem> */
    public function getItems(): Collection { return $this->items; }

    public function addItem(TransactionItem $item): static
    {
        if (!$this->items->contains($item)) {
            $this->items->add($item);
            $item->setTransaction($this);
        }
        return $this;
    }

    public function removeItem(TransactionItem $item): static
    {
        if ($this->items->removeElement($item)) {
            $item->setTransaction(null);
        }

        return $this;
    }

    public function getCreatedBy(): ?User { return $this->createdBy; }
    public function setCreatedBy(User $u): static { $this->createdBy = $u; return $this; }

    public function getUpdatedBy(): ?User { return $this->updatedBy; }
    public function setUpdatedBy(?User $u): static { $this->updatedBy = $u; return $this; }

    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): ?\DateTimeImmutable { return $this->updatedAt; }
}
