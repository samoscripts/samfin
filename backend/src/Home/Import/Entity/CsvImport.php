<?php

namespace App\Home\Import\Entity;

use App\Home\Configuration\General\Entity\Party;
use App\Home\Configuration\General\Entity\PartyBankAccount;
use App\Home\Import\Repository\CsvImportRepository;
use App\Identity\Entity\User;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CsvImportRepository::class)]
#[ORM\Table(name: 'csv_import')]
#[ORM\HasLifecycleCallbacks]
class CsvImport
{
    public const STATUS_PENDING   = 'PENDING';
    public const STATUS_VALIDATED = 'VALIDATED';
    public const STATUS_FAILED    = 'FAILED';
    public const STATUS_IMPORTED  = 'IMPORTED';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 30)]
    private string $source = '';

    #[ORM\Column(length: 20)]
    private string $status = self::STATUS_PENDING;

    #[ORM\Column(name: 'original_filename', length: 255, nullable: true)]
    private ?string $originalFilename = null;

    #[ORM\Column(name: 'file_sha256', length: 64, nullable: true)]
    private ?string $fileSha256 = null;

    #[ORM\Column(name: 'csv_format', length: 40, nullable: true)]
    private ?string $csvFormat = null;

    #[ORM\Column(name: 'period_from', nullable: true)]
    private ?\DateTimeImmutable $periodFrom = null;

    #[ORM\Column(name: 'period_to', nullable: true)]
    private ?\DateTimeImmutable $periodTo = null;

    #[ORM\Column(name: 'detected_client_name', length: 255, nullable: true)]
    private ?string $detectedClientName = null;

    #[ORM\Column(name: 'detected_account_number', length: 50, nullable: true)]
    private ?string $detectedAccountNumber = null;

    #[ORM\Column(name: 'detected_account_display', length: 100, nullable: true)]
    private ?string $detectedAccountDisplay = null;

    #[ORM\ManyToOne(targetEntity: PartyBankAccount::class)]
    #[ORM\JoinColumn(name: 'party_bank_account_id', nullable: true, onDelete: 'SET NULL')]
    private ?PartyBankAccount $partyBankAccount = null;

    #[ORM\ManyToOne(targetEntity: Party::class)]
    #[ORM\JoinColumn(name: 'party_id', nullable: true, onDelete: 'SET NULL')]
    private ?Party $party = null;

    #[ORM\Column(name: 'rows_total')]
    private int $rowsTotal = 0;

    #[ORM\Column(name: 'rows_parsed')]
    private int $rowsParsed = 0;

    #[ORM\Column(name: 'rows_invalid')]
    private int $rowsInvalid = 0;

    #[ORM\Column(name: 'error_summary', type: 'text', nullable: true)]
    private ?string $errorSummary = null;

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
            'id'                     => $this->id,
            'source'                 => $this->source,
            'status'                 => $this->status,
            'originalFilename'       => $this->originalFilename,
            'fileSha256'             => $this->fileSha256,
            'csvFormat'              => $this->csvFormat,
            'periodFrom'             => $this->periodFrom?->format('Y-m-d'),
            'periodTo'               => $this->periodTo?->format('Y-m-d'),
            'detectedClientName'     => $this->detectedClientName,
            'detectedAccountNumber'  => $this->detectedAccountNumber,
            'detectedAccountDisplay' => $this->detectedAccountDisplay,
            'partyBankAccountId'     => $this->partyBankAccount?->getId(),
            'partyId'                => $this->party?->getId(),
            'partyName'              => $this->party?->getName(),
            'rowsTotal'              => $this->rowsTotal,
            'rowsParsed'             => $this->rowsParsed,
            'rowsInvalid'            => $this->rowsInvalid,
            'errorSummary'           => $this->errorSummary,
            'createdById'            => $this->createdBy?->getId(),
            'createdAt'              => $this->createdAt?->format('Y-m-d\TH:i:s\Z'),
            'updatedAt'              => $this->updatedAt?->format('Y-m-d\TH:i:s\Z'),
        ];
    }

    public function getId(): ?int { return $this->id; }

    public function getSource(): string { return $this->source; }
    public function setSource(string $s): static { $this->source = $s; return $this; }

    public function getStatus(): string { return $this->status; }
    public function setStatus(string $s): static { $this->status = $s; return $this; }

    public function getOriginalFilename(): ?string { return $this->originalFilename; }
    public function setOriginalFilename(?string $v): static { $this->originalFilename = $v; return $this; }

    public function getFileSha256(): ?string { return $this->fileSha256; }
    public function setFileSha256(?string $v): static { $this->fileSha256 = $v; return $this; }

    public function getCsvFormat(): ?string { return $this->csvFormat; }
    public function setCsvFormat(?string $v): static { $this->csvFormat = $v; return $this; }

    public function getPeriodFrom(): ?\DateTimeImmutable { return $this->periodFrom; }
    public function setPeriodFrom(?\DateTimeImmutable $v): static { $this->periodFrom = $v; return $this; }

    public function getPeriodTo(): ?\DateTimeImmutable { return $this->periodTo; }
    public function setPeriodTo(?\DateTimeImmutable $v): static { $this->periodTo = $v; return $this; }

    public function getDetectedClientName(): ?string { return $this->detectedClientName; }
    public function setDetectedClientName(?string $v): static { $this->detectedClientName = $v; return $this; }

    public function getDetectedAccountNumber(): ?string { return $this->detectedAccountNumber; }
    public function setDetectedAccountNumber(?string $v): static { $this->detectedAccountNumber = $v; return $this; }

    public function getDetectedAccountDisplay(): ?string { return $this->detectedAccountDisplay; }
    public function setDetectedAccountDisplay(?string $v): static { $this->detectedAccountDisplay = $v; return $this; }

    public function getPartyBankAccount(): ?PartyBankAccount { return $this->partyBankAccount; }
    public function setPartyBankAccount(?PartyBankAccount $v): static { $this->partyBankAccount = $v; return $this; }

    public function getParty(): ?Party { return $this->party; }
    public function setParty(?Party $v): static { $this->party = $v; return $this; }

    public function getRowsTotal(): int { return $this->rowsTotal; }
    public function setRowsTotal(int $v): static { $this->rowsTotal = $v; return $this; }

    public function getRowsParsed(): int { return $this->rowsParsed; }
    public function setRowsParsed(int $v): static { $this->rowsParsed = $v; return $this; }

    public function getRowsInvalid(): int { return $this->rowsInvalid; }
    public function setRowsInvalid(int $v): static { $this->rowsInvalid = $v; return $this; }

    public function getErrorSummary(): ?string { return $this->errorSummary; }
    public function setErrorSummary(?string $v): static { $this->errorSummary = $v; return $this; }

    public function getCreatedBy(): ?User { return $this->createdBy; }
    public function setCreatedBy(User $u): static { $this->createdBy = $u; return $this; }

    public function getUpdatedBy(): ?User { return $this->updatedBy; }
    public function setUpdatedBy(?User $u): static { $this->updatedBy = $u; return $this; }

    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): ?\DateTimeImmutable { return $this->updatedAt; }
}
