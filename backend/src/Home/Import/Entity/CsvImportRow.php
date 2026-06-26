<?php

namespace App\Home\Import\Entity;

use App\Home\Import\Repository\CsvImportRowRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CsvImportRowRepository::class)]
#[ORM\Table(name: 'csv_import_row')]
#[ORM\HasLifecycleCallbacks]
class CsvImportRow
{
    public const STATUS_VALIDATED   = 'VALIDATED';
    public const STATUS_PARSE_ERROR = 'PARSE_ERROR';
    public const STATUS_DUPLICATE   = 'DUPLICATE';
    public const STATUS_IMPORTED    = 'IMPORTED';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: CsvImport::class)]
    #[ORM\JoinColumn(name: 'csv_import_id', nullable: false, onDelete: 'CASCADE')]
    private ?CsvImport $csvImport = null;

    #[ORM\Column(name: 'csv_format', length: 40, nullable: true)]
    private ?string $csvFormat = null;

    #[ORM\Column(name: 'line_no')]
    private int $lineNo = 0;

    #[ORM\Column(name: 'booking_date', type: 'date_immutable', nullable: true)]
    private ?\DateTimeImmutable $bookingDate = null;

    #[ORM\Column(name: 'operation_date', nullable: true)]
    private ?\DateTimeImmutable $operationDate = null;

    #[ORM\Column(name: 'description_raw', type: 'text', nullable: true)]
    private ?string $descriptionRaw = null;

    #[ORM\Column(name: 'operation_type_raw', length: 255, nullable: true)]
    private ?string $operationTypeRaw = null;

    #[ORM\Column(name: 'title_raw', type: 'text', nullable: true)]
    private ?string $titleRaw = null;

    #[ORM\Column(name: 'title_clean', type: 'text', nullable: true)]
    private ?string $titleClean = null;

    #[ORM\Column(name: 'counterparty_name_raw', length: 512, nullable: true)]
    private ?string $counterpartyNameRaw = null;

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

    #[ORM\Column(name: 'balance_after_minor', nullable: true)]
    private ?int $balanceAfterMinor = null;

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
            'id'                     => $this->id,
            'csvImportId'            => $this->csvImport?->getId(),
            'csvFormat'              => $this->csvFormat,
            'lineNo'                 => $this->lineNo,
            'bookingDate'            => $this->bookingDate?->format('Y-m-d'),
            'operationDate'          => $this->operationDate?->format('Y-m-d'),
            'descriptionRaw'         => $this->descriptionRaw,
            'operationTypeRaw'       => $this->operationTypeRaw,
            'titleRaw'               => $this->titleRaw,
            'titleClean'             => $this->titleClean,
            'counterpartyNameRaw'    => $this->counterpartyNameRaw,
            'ownAccountLabelRaw'     => $this->ownAccountLabelRaw,
            'counterpartyAccountRaw' => $this->counterpartyAccountRaw,
            'bankCategoryRaw'        => $this->bankCategoryRaw,
            'amountRaw'              => $this->amountRaw,
            'amountMinor'            => $this->amountMinor,
            'balanceAfterMinor'      => $this->balanceAfterMinor,
            'parseStatus'            => $this->parseStatus,
            'parseError'             => $this->parseError,
        ];
    }

    public function getId(): ?int { return $this->id; }

    public function getCsvImport(): ?CsvImport { return $this->csvImport; }
    public function setCsvImport(CsvImport $v): static { $this->csvImport = $v; return $this; }

    public function getCsvFormat(): ?string { return $this->csvFormat; }
    public function setCsvFormat(?string $v): static { $this->csvFormat = $v; return $this; }

    public function getLineNo(): int { return $this->lineNo; }
    public function setLineNo(int $v): static { $this->lineNo = $v; return $this; }

    public function getBookingDate(): ?\DateTimeImmutable { return $this->bookingDate; }
    public function setBookingDate(?\DateTimeImmutable $v): static { $this->bookingDate = $v; return $this; }

    public function getOperationDate(): ?\DateTimeImmutable { return $this->operationDate; }
    public function setOperationDate(?\DateTimeImmutable $v): static { $this->operationDate = $v; return $this; }

    public function getDescriptionRaw(): ?string { return $this->descriptionRaw; }
    public function setDescriptionRaw(?string $v): static { $this->descriptionRaw = $v; return $this; }

    public function getOperationTypeRaw(): ?string { return $this->operationTypeRaw; }
    public function setOperationTypeRaw(?string $v): static { $this->operationTypeRaw = $v; return $this; }

    public function getTitleRaw(): ?string { return $this->titleRaw; }
    public function setTitleRaw(?string $v): static { $this->titleRaw = $v; return $this; }

    public function getTitle(): ?string { return $this->titleClean; }
    public function getTitleClean(): ?string { return $this->titleClean; }
    public function setTitleClean(?string $v): static { $this->titleClean = $v; return $this; }

    public function getCounterpartyNameRaw(): ?string { return $this->counterpartyNameRaw; }
    public function setCounterpartyNameRaw(?string $v): static { $this->counterpartyNameRaw = $v; return $this; }

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

    public function getBalanceAfterMinor(): ?int { return $this->balanceAfterMinor; }
    public function setBalanceAfterMinor(?int $v): static { $this->balanceAfterMinor = $v; return $this; }

    public function getParseStatus(): string { return $this->parseStatus; }
    public function setParseStatus(string $v): static { $this->parseStatus = $v; return $this; }

    public function getParseError(): ?string { return $this->parseError; }
    public function setParseError(?string $v): static { $this->parseError = $v; return $this; }

    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }
}
