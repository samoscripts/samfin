<?php

namespace App\Home\Import\Entity;

use App\Home\Import\Repository\CsvImportErrorRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CsvImportErrorRepository::class)]
#[ORM\Table(name: 'csv_import_error')]
#[ORM\HasLifecycleCallbacks]
class CsvImportError
{
    public const SCOPE_HEADER = 'HEADER';
    public const SCOPE_ROW    = 'ROW';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: CsvImport::class)]
    #[ORM\JoinColumn(name: 'csv_import_id', nullable: false, onDelete: 'CASCADE')]
    private ?CsvImport $csvImport = null;

    #[ORM\Column(length: 10)]
    private string $scope = self::SCOPE_HEADER;

    #[ORM\Column(name: 'line_no', nullable: true)]
    private ?int $lineNo = null;

    #[ORM\Column(length: 50)]
    private string $code = '';

    #[ORM\Column(type: 'text')]
    private string $message = '';

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
            'id'          => $this->id,
            'csvImportId' => $this->csvImport?->getId(),
            'scope'       => $this->scope,
            'lineNo'      => $this->lineNo,
            'code'        => $this->code,
            'message'     => $this->message,
            'createdAt'   => $this->createdAt?->format('Y-m-d\TH:i:s\Z'),
        ];
    }

    public function getId(): ?int { return $this->id; }

    public function getCsvImport(): ?CsvImport { return $this->csvImport; }
    public function setCsvImport(CsvImport $v): static { $this->csvImport = $v; return $this; }

    public function getScope(): string { return $this->scope; }
    public function setScope(string $v): static { $this->scope = $v; return $this; }

    public function getLineNo(): ?int { return $this->lineNo; }
    public function setLineNo(?int $v): static { $this->lineNo = $v; return $this; }

    public function getCode(): string { return $this->code; }
    public function setCode(string $v): static { $this->code = $v; return $this; }

    public function getMessage(): string { return $this->message; }
    public function setMessage(string $v): static { $this->message = $v; return $this; }

    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }
}
