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

    new ORM\Index(name: 'idx_transaction_trans_date', columns: ['trans_date']),

    new ORM\Index(name: 'idx_transaction_status', columns: ['status']),

    new ORM\Index(name: 'idx_transaction_direction', columns: ['direction']),

    new ORM\Index(name: 'idx_transaction_import', columns: ['import_id']),

    new ORM\Index(name: 'idx_transaction_paid_from_party', columns: ['paid_from_party_id']),

    new ORM\Index(name: 'idx_transaction_paid_to_party', columns: ['paid_to_party_id']),

    new ORM\Index(name: 'fk_transaction_created_by', columns: ['created_by']),

    new ORM\Index(name: 'fk_transaction_updated_by', columns: ['updated_by']),

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



    #[ORM\Column(name: 'trans_date', type: 'date_immutable')]

    private ?\DateTimeImmutable $transDate = null;



    #[ORM\Column(name: 'booking_date', type: 'date_immutable', nullable: true)]

    private ?\DateTimeImmutable $bookingDate = null;



    #[ORM\Column(name: 'trans_title', type: 'text', nullable: true)]

    private ?string $transTitle = null;



    #[ORM\Column(name: 'trans_description', type: 'text', nullable: true)]

    private ?string $transDescription = null;



    #[ORM\Column(name: 'trans_custom_description', type: 'text', nullable: true)]

    private ?string $transCustomDescription = null;



    #[ORM\Column(name: 'amount_minor')]

    private int $amountMinor = 0;



    #[ORM\Column(name: 'balance_after_minor', nullable: true)]

    private ?int $balanceAfterMinor = null;



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



    #[ORM\Column(name: 'counterparty_name', length: 512, nullable: true)]

    private ?string $counterpartyName = null;



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

            'transactionId'       => $this->id,

            'transDate'           => $this->transDate?->format('Y-m-d'),

            'bookingDate'         => $this->bookingDate?->format('Y-m-d'),

            'transTitle'          => $this->transTitle,

            'transDescription'        => $this->transDescription,

            'transCustomDescription'  => $this->transCustomDescription,

            'balanceAfterMinor'   => $this->balanceAfterMinor,

            'counterpartyName'    => $this->counterpartyName,

            'amount'              => round($this->amountMinor / 100, 2),

            'direction'           => $this->direction,

            'status'              => $this->status,

            'paidFromPartyId'     => $this->paidFromParty?->getId(),

            'paidFrom'            => $this->paidFromParty?->getName(),

            'paidToPartyId'       => $this->paidToParty?->getId(),

            'paidTo'              => $this->paidToParty?->getName(),

            'source'              => $this->source,

            'counterpartyAccountNumber' => $this->counterpartyAccountNumber,

            'items'               => array_values(array_map(

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



    public function getTransDate(): ?\DateTimeImmutable { return $this->transDate; }

    public function setTransDate(?\DateTimeImmutable $v): static { $this->transDate = $v; return $this; }



    public function getBookingDate(): ?\DateTimeImmutable { return $this->bookingDate; }

    public function setBookingDate(?\DateTimeImmutable $v): static { $this->bookingDate = $v; return $this; }



    public function getTransTitle(): ?string { return $this->transTitle; }

    public function setTransTitle(?string $v): static { $this->transTitle = $v; return $this; }



    public function getTransDescription(): ?string { return $this->transDescription; }

    public function setTransDescription(?string $v): static { $this->transDescription = $v; return $this; }



    public function getTransCustomDescription(): ?string { return $this->transCustomDescription; }

    public function setTransCustomDescription(?string $v): static { $this->transCustomDescription = $v; return $this; }



    public function getBalanceAfterMinor(): ?int { return $this->balanceAfterMinor; }

    public function setBalanceAfterMinor(?int $v): static { $this->balanceAfterMinor = $v; return $this; }



    public function getCounterpartyName(): ?string { return $this->counterpartyName; }

    public function setCounterpartyName(?string $v): static { $this->counterpartyName = $v; return $this; }



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


