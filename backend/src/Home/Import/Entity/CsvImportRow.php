<?php

namespace App\Home\Import\Entity;

use App\Home\Import\Repository\CsvImportRowRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CsvImportRowRepository::class)]
#[ORM\Table(name: 'csv_import_row')]
#[ORM\HasLifecycleCallbacks]
class CsvImportRow
{
    public const STATUS_VALIDATED  = 'VALIDATED';
    public const STATUS_PARSE_ERROR = 'PARSE_ERROR';
    public const STATUS_DUPLICATE  = 'DUPLICATE';
    public const STATUS_IMPORTED   = 'IMPORTED';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: CsvImport::class)]
    #[ORM\JoinColumn(name: 'csv_import_id', nullable: false, onDelete: 'CASCADE')]
    private ?CsvImport $csvImport = null;

    #[ORM\Column(name: 'line_no')]
    private int $lineNo = 0;

    #[ORM\Column(name: 'operation_date', nullable: true)]
    private ?\DateTimeImmutable $operationDate = null;

    #[ORM\Column(name: 'description_raw', type: 'text', nullable: true)]
    private ?string $descriptionRaw = null;

    #[ORM\Column(name: 'own_account_label_raw', length: 255, nullable: true)]
    private ?string $ownAccountLabelRaw = null;

    #[ORM\Column(name: 'counterparty_account_raw', length: 26, nullable: true)]
    private ?string $counterpartyAccountRaw = null;

    #[ORM\Column(name: 'bank_category_raw', length: 255, nullable: true)]
    private ?string $bankCategoryRaw = null;

    #[ORM\Column(name: 'amount_raw', length: 50, nullable: true)]
    private ?string $amountRaw = null;

    #[ORM\Column(name: 'amount_minor', nullable: true)]
    private ?int $amountMinor = null;

    #[ORM\Column(length: 20)]
    private string $parseStatus = self::STATUS_VALIDATED;

    #[ORM\Column(name: 'parse_error', type: 'text', nullable: true)]
    private ?string $parseError = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\PrePersist]
    public function prePersist(): void
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function toApiArray(): array
    {
        return [
            'id'              => $this->id,
            'csvImportId'     => $this->csvImport?->getId(),
            'lineNo'          => $this->lineNo,
            'operationDate'   => $this->operationDate?->format('Y-m-d'),
            'descriptionRaw'  => $this->descriptionRaw,
            'ownAccountLabelRaw'      => $this->ownAccountLabelRaw,
            'counterpartyAccountRaw'  => $this->counterpartyAccountRaw,
            'bankCategoryRaw' => $this->bankCategoryRaw,
            'amountRaw'       => $this->amountRaw,
            'amountMinor'     => $this->amountMinor,
            'parseStatus'     => $this->parseStatus,
            'parseError'      => $this->parseError,
        ];
    }

    public function getId(): ?int { return $this->id; }

    public function getCsvImport(): ?CsvImport { return $this->csvImport; }
    public function setCsvImport(CsvImport $v): static { $this->csvImport = $v; return $this; }

    public function getLineNo(): int { return $this->lineNo; }
    public function setLineNo(int $v): static { $this->lineNo = $v; return $this; }

    public function getOperationDate(): ?\DateTimeImmutable { return $this->operationDate; }
    public function setOperationDate(?\DateTimeImmutable $v): static { $this->operationDate = $v; return $this; }

    public function getDescriptionRaw(): ?string { return $this->descriptionRaw; }
    public function setDescriptionRaw(?string $v): static { $this->descriptionRaw = $v; return $this; }

    public function getOwnAccountLabelRaw(): ?string { return $this->ownAccountLabelRaw; }
    public function setOwnAccountLabelRaw(?string $v): static { $this->ownAccountLabelRaw = $v; return $this; }

    public function getCounterpartyAccountRaw(): ?string { return $this->counterpartyAccountRaw; }
    public function setCounterpartyAccountRaw(?string $v): static { $this->counterpartyAccountRaw = $v; return $this; }

    public function getBankCategoryRaw(): ?string { return $this->bankCategoryRaw; }
    public function setBankCategoryRaw(?string $v): static { $this->bankCategoryRaw = $v; return $this; }

    public function getAmountRaw(): ?string { return $this->amountRaw; }
    public function setAmountRaw(?string $v): static { $this->amountRaw = $v; return $this; }

    public function getAmountMinor(): ?int { return $this->amountMinor; }
    public function setAmountMinor(?int $v): static { $this->amountMinor = $v; return $this; }

    public function getParseStatus(): string { return $this->parseStatus; }
    public function setParseStatus(string $v): static { $this->parseStatus = $v; return $this; }

    public function getParseError(): ?string { return $this->parseError; }
    public function setParseError(?string $v): static { $this->parseError = $v; return $this; }

    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }
}
