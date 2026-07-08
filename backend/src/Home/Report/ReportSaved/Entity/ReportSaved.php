<?php

namespace App\Home\Report\ReportSaved\Entity;

use App\Home\Report\ReportSaved\Repository\ReportSavedRepository;
use App\Identity\Entity\User;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ReportSavedRepository::class)]
#[ORM\Table(name: 'report_saved', uniqueConstraints: [
    new ORM\UniqueConstraint(name: 'uniq_report_saved_user_type_name', columns: ['user_id', 'type', 'name']),
])]
#[ORM\HasLifecycleCallbacks]
class ReportSaved
{
    public const TYPE_TREND = 'trend';
    public const TYPE_BREAKDOWN = 'breakdown';
    public const TYPES = [self::TYPE_TREND, self::TYPE_BREAKDOWN];

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'user_id', nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    #[ORM\Column(length: 20)]
    private string $type = self::TYPE_BREAKDOWN;

    #[ORM\Column(length: 200)]
    private string $name = '';

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $description = null;

    /** @var array<string, mixed> */
    #[ORM\Column(name: 'params_json', type: 'json')]
    private array $paramsJson = [];

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

    /** @return array<string, mixed> */
    public function toApiArray(): array
    {
        return [
            'id'          => $this->id,
            'type'        => $this->type,
            'name'        => $this->name,
            'description' => $this->description,
            'params'      => $this->paramsJson,
            'createdAt'   => $this->createdAt?->format('Y-m-d\TH:i:s\Z'),
            'updatedAt'   => $this->updatedAt?->format('Y-m-d\TH:i:s\Z'),
        ];
    }

    public function getId(): ?int { return $this->id; }

    public function getUser(): ?User { return $this->user; }
    public function setUser(User $user): static { $this->user = $user; return $this; }

    public function getType(): string { return $this->type; }
    public function setType(string $type): static { $this->type = $type; return $this; }

    public function getName(): string { return $this->name; }
    public function setName(string $name): static { $this->name = $name; return $this; }

    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $description): static { $this->description = $description; return $this; }

    /** @return array<string, mixed> */
    public function getParamsJson(): array { return $this->paramsJson; }

    /** @param array<string, mixed> $paramsJson */
    public function setParamsJson(array $paramsJson): static { $this->paramsJson = $paramsJson; return $this; }

    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): ?\DateTimeImmutable { return $this->updatedAt; }
}
