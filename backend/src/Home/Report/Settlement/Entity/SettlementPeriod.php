<?php

namespace App\Home\Report\Settlement\Entity;

use App\Home\Report\Settlement\Repository\SettlementPeriodRepository;
use App\Identity\Entity\User;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: SettlementPeriodRepository::class)]
#[ORM\Table(name: 'settlement_period')]
#[ORM\UniqueConstraint(name: 'uniq_settlement_period_user_year', columns: ['user_id', 'year'])]
#[ORM\HasLifecycleCallbacks]
class SettlementPeriod
{
    public const STATUS_OPEN   = 'open';
    public const STATUS_CLOSED = 'closed';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'user_id', nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    #[ORM\Column]
    private int $year = 0;

    #[ORM\Column(name: 'date_from', type: 'date_immutable')]
    private ?\DateTimeImmutable $dateFrom = null;

    #[ORM\Column(name: 'date_to', type: 'date_immutable')]
    private ?\DateTimeImmutable $dateTo = null;

    #[ORM\Column(length: 10)]
    private string $status = self::STATUS_OPEN;

    /** @var array<string, mixed>|null */
    #[ORM\Column(name: 'closing_snapshot_json', type: 'json', nullable: true)]
    private ?array $closingSnapshotJson = null;

    #[ORM\Column(name: 'closed_at', nullable: true)]
    private ?\DateTimeImmutable $closedAt = null;

    #[ORM\Column(name: 'created_at')]
    private ?\DateTimeImmutable $createdAt = null;

    public static function forYear(User $user, int $year): self
    {
        $period = new self();
        $period->setUser($user);
        $period->setYear($year);
        $period->setDateFrom(new \DateTimeImmutable(sprintf('%04d-01-01', $year)));
        $period->setDateTo(new \DateTimeImmutable(sprintf('%04d-12-31', $year)));
        $period->setStatus(self::STATUS_OPEN);

        return $period;
    }

    #[ORM\PrePersist]
    public function onPrePersist(): void
    {
        if ($this->createdAt === null) {
            $this->createdAt = new \DateTimeImmutable();
        }
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(?User $user): static
    {
        $this->user = $user;

        return $this;
    }

    public function getYear(): int
    {
        return $this->year;
    }

    public function setYear(int $year): static
    {
        $this->year = $year;

        return $this;
    }

    public function getDateFrom(): ?\DateTimeImmutable
    {
        return $this->dateFrom;
    }

    public function setDateFrom(\DateTimeImmutable $dateFrom): static
    {
        $this->dateFrom = $dateFrom;

        return $this;
    }

    public function getDateTo(): ?\DateTimeImmutable
    {
        return $this->dateTo;
    }

    public function setDateTo(\DateTimeImmutable $dateTo): static
    {
        $this->dateTo = $dateTo;

        return $this;
    }

    public function getStatus(): string
    {
        return $this->status;
    }

    public function setStatus(string $status): static
    {
        $this->status = $status;

        return $this;
    }

    public function isClosed(): bool
    {
        return $this->status === self::STATUS_CLOSED;
    }

    /** @return array<string, mixed>|null */
    public function getClosingSnapshotJson(): ?array
    {
        return $this->closingSnapshotJson;
    }

    /** @param array<string, mixed>|null $closingSnapshotJson */
    public function setClosingSnapshotJson(?array $closingSnapshotJson): static
    {
        $this->closingSnapshotJson = $closingSnapshotJson;

        return $this;
    }

    public function getClosedAt(): ?\DateTimeImmutable
    {
        return $this->closedAt;
    }

    public function setClosedAt(?\DateTimeImmutable $closedAt): static
    {
        $this->closedAt = $closedAt;

        return $this;
    }

    /** @return array<string, mixed> */
    public function toApiArray(): array
    {
        return [
            'year'      => $this->year,
            'dateFrom'  => $this->dateFrom?->format('Y-m-d'),
            'dateTo'    => $this->dateTo?->format('Y-m-d'),
            'status'    => $this->status,
            'closedAt'  => $this->closedAt?->format(\DateTimeInterface::ATOM),
        ];
    }
}
