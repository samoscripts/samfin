<?php

namespace App\Home\Configuration\Entity;

use App\Home\Configuration\Repository\PartyBankAccountRepository;
use App\Identity\Entity\User;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: PartyBankAccountRepository::class)]
#[ORM\Table(name: 'party_bank_account')]
#[ORM\HasLifecycleCallbacks]
class PartyBankAccount
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Party::class)]
    #[ORM\JoinColumn(name: 'party_id', nullable: false, onDelete: 'RESTRICT')]
    private ?Party $party = null;

    #[ORM\Column(name: 'bank_name', length: 200, nullable: true)]
    private ?string $bankName = null;

    #[ORM\Column(name: 'account_number', length: 50)]
    private ?string $accountNumber = null;

    #[ORM\Column(name: 'display_name', length: 200, nullable: true)]
    private ?string $displayName = null;

    #[ORM\Column(name: 'owner_name_from_bank', length: 200, nullable: true)]
    private ?string $ownerNameFromBank = null;

    #[ORM\Column(length: 10, options: ['default' => 'PLN'])]
    private string $currency = 'PLN';

    #[ORM\Column]
    private bool $active = true;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'created_by', referencedColumnName: 'id', nullable: false)]
    private ?User $createdBy = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'updated_by', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
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
            'id'                => $this->id,
            'partyId'           => $this->party?->getId(),
            'partyName'         => $this->party?->getName(),
            'bankName'          => $this->bankName,
            'accountNumber'     => $this->accountNumber,
            'displayName'       => $this->displayName,
            'ownerNameFromBank' => $this->ownerNameFromBank,
            'currency'          => $this->currency,
            'active'            => $this->active,
            'createdById'       => $this->createdBy?->getId(),
            'updatedById'       => $this->updatedBy?->getId(),
            'createdAt'         => $this->createdAt?->format('Y-m-d\TH:i:s\Z'),
            'updatedAt'         => $this->updatedAt?->format('Y-m-d\TH:i:s\Z'),
        ];
    }

    public function getId(): ?int { return $this->id; }

    public function getParty(): ?Party { return $this->party; }
    public function setParty(?Party $party): static { $this->party = $party; return $this; }

    public function getBankName(): ?string { return $this->bankName; }
    public function setBankName(?string $bankName): static { $this->bankName = $bankName; return $this; }

    public function getAccountNumber(): ?string { return $this->accountNumber; }
    public function setAccountNumber(string $accountNumber): static { $this->accountNumber = $accountNumber; return $this; }

    public function getDisplayName(): ?string { return $this->displayName; }
    public function setDisplayName(?string $displayName): static { $this->displayName = $displayName; return $this; }

    public function getOwnerNameFromBank(): ?string { return $this->ownerNameFromBank; }
    public function setOwnerNameFromBank(?string $ownerNameFromBank): static { $this->ownerNameFromBank = $ownerNameFromBank; return $this; }

    public function getCurrency(): string { return $this->currency; }
    public function setCurrency(string $currency): static { $this->currency = $currency; return $this; }

    public function isActive(): bool { return $this->active; }
    public function setActive(bool $active): static { $this->active = $active; return $this; }

    public function getCreatedBy(): ?User { return $this->createdBy; }
    public function setCreatedBy(User $user): static { $this->createdBy = $user; return $this; }

    public function getUpdatedBy(): ?User { return $this->updatedBy; }
    public function setUpdatedBy(?User $user): static { $this->updatedBy = $user; return $this; }

    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): ?\DateTimeImmutable { return $this->updatedAt; }
}
