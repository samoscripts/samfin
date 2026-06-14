<?php

namespace App\Home\Transaction\ClassificationRule\Entity;

use App\Home\Configuration\Entity\Party;
use App\Home\Transaction\ClassificationRule\Repository\ClassificationRuleRepository;
use App\Home\Transaction\Entity\Transaction;
use App\Identity\Entity\User;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ClassificationRuleRepository::class)]
#[ORM\Table(name: 'classification_rule')]
#[ORM\HasLifecycleCallbacks]
class ClassificationRule
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Party::class)]
    #[ORM\JoinColumn(name: 'party_id', nullable: false, onDelete: 'RESTRICT')]
    private ?Party $party = null;

    #[ORM\Column(length: 200)]
    private string $name = '';

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $description = null;

    #[ORM\Column]
    private int $priority = 100;

    #[ORM\Column]
    private bool $enabled = true;

    #[ORM\Column(name: 'stop_on_match')]
    private bool $stopOnMatch = true;

    /** @var array<string, mixed> */
    #[ORM\Column(name: 'conditions_json', type: 'json')]
    private array $conditionsJson = ['conditions' => []];

    /** @var array<string, mixed> */
    #[ORM\Column(name: 'actions_json', type: 'json')]
    private array $actionsJson = ['transaction' => [], 'items' => []];

    #[ORM\ManyToOne(targetEntity: Transaction::class)]
    #[ORM\JoinColumn(name: 'created_from_transaction_id', nullable: true, onDelete: 'SET NULL')]
    private ?Transaction $createdFromTransaction = null;

    #[ORM\Column]
    private bool $active = true;

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
            'id'                       => $this->id,
            'partyId'                  => $this->party?->getId(),
            'partyName'                => $this->party?->getName(),
            'name'                     => $this->name,
            'description'              => $this->description,
            'priority'                 => $this->priority,
            'enabled'                  => $this->enabled,
            'stopOnMatch'              => $this->stopOnMatch,
            'conditions'               => $this->conditionsJson,
            'actions'                  => $this->actionsJson,
            'createdFromTransactionId' => $this->createdFromTransaction?->getId(),
            'active'                   => $this->active,
            'createdById'              => $this->createdBy?->getId(),
            'updatedById'              => $this->updatedBy?->getId(),
            'createdAt'                => $this->createdAt?->format('Y-m-d\TH:i:s\Z'),
            'updatedAt'                => $this->updatedAt?->format('Y-m-d\TH:i:s\Z'),
        ];
    }

    public function getId(): ?int { return $this->id; }

    public function getParty(): ?Party { return $this->party; }
    public function setParty(Party $party): static { $this->party = $party; return $this; }

    public function getName(): string { return $this->name; }
    public function setName(string $name): static { $this->name = $name; return $this; }

    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $description): static { $this->description = $description; return $this; }

    public function getPriority(): int { return $this->priority; }
    public function setPriority(int $priority): static { $this->priority = $priority; return $this; }

    public function isEnabled(): bool { return $this->enabled; }
    public function setEnabled(bool $enabled): static { $this->enabled = $enabled; return $this; }

    public function isStopOnMatch(): bool { return $this->stopOnMatch; }
    public function setStopOnMatch(bool $stopOnMatch): static { $this->stopOnMatch = $stopOnMatch; return $this; }

    /** @return array<string, mixed> */
    public function getConditionsJson(): array { return $this->conditionsJson; }

    /** @param array<string, mixed> $conditionsJson */
    public function setConditionsJson(array $conditionsJson): static { $this->conditionsJson = $conditionsJson; return $this; }

    /** @return array<string, mixed> */
    public function getActionsJson(): array { return $this->actionsJson; }

    /** @param array<string, mixed> $actionsJson */
    public function setActionsJson(array $actionsJson): static { $this->actionsJson = $actionsJson; return $this; }

    public function getCreatedFromTransaction(): ?Transaction { return $this->createdFromTransaction; }
    public function setCreatedFromTransaction(?Transaction $tx): static { $this->createdFromTransaction = $tx; return $this; }

    public function isActive(): bool { return $this->active; }
    public function setActive(bool $active): static { $this->active = $active; return $this; }

    public function getCreatedBy(): ?User { return $this->createdBy; }
    public function setCreatedBy(User $user): static { $this->createdBy = $user; return $this; }

    public function getUpdatedBy(): ?User { return $this->updatedBy; }
    public function setUpdatedBy(?User $user): static { $this->updatedBy = $user; return $this; }
}
