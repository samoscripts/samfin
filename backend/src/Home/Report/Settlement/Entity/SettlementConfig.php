<?php

namespace App\Home\Report\Settlement\Entity;

use App\Home\Configuration\Entity\Party;
use App\Home\Configuration\Entity\Wallet;
use App\Home\Report\Settlement\Repository\SettlementConfigRepository;
use App\Identity\Entity\User;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: SettlementConfigRepository::class)]
#[ORM\Table(name: 'settlement_config')]
#[ORM\HasLifecycleCallbacks]
class SettlementConfig
{
    public const DEPOSITOR_MACIEK = 'maciek';
    public const DEPOSITOR_BASIA  = 'basia';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'user_id', nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    #[ORM\ManyToOne(targetEntity: Party::class)]
    #[ORM\JoinColumn(name: 'settlement_party_id', nullable: true, onDelete: 'SET NULL')]
    private ?Party $settlementParty = null;

    #[ORM\ManyToOne(targetEntity: Wallet::class)]
    #[ORM\JoinColumn(name: 'home_budget_wallet_id', nullable: true, onDelete: 'SET NULL')]
    private ?Wallet $homeBudgetWallet = null;

    #[ORM\Column(name: 'base_deposit_amount_minor')]
    private int $baseDepositAmountMinor = 500_000;

    /** @var list<int> */
    #[ORM\Column(name: 'maciek_source_party_ids', type: 'json')]
    private array $maciekSourcePartyIds = [];

    /** @var list<int> */
    #[ORM\Column(name: 'basia_source_party_ids', type: 'json')]
    private array $basiaSourcePartyIds = [];

    /** @var array<string, string> walletId (string) => maciek|basia */
    #[ORM\Column(name: 'wallet_settlement_owner', type: 'json')]
    private array $walletSettlementOwner = [];

    #[ORM\Column(name: 'default_next_depositor', length: 10)]
    private string $defaultNextDepositor = self::DEPOSITOR_MACIEK;

    #[ORM\Column(name: 'carry_over_maciek_minor')]
    private int $carryOverMaciekMinor = 0;

    #[ORM\Column(name: 'carry_over_basia_minor')]
    private int $carryOverBasiaMinor = 0;

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
            'settlementPartyId'     => $this->settlementParty?->getId(),
            'homeBudgetWalletId'    => $this->homeBudgetWallet?->getId(),
            'baseDepositAmount'     => round($this->baseDepositAmountMinor / 100, 2),
            'maciekSourcePartyIds'  => $this->maciekSourcePartyIds,
            'basiaSourcePartyIds'   => $this->basiaSourcePartyIds,
            'walletSettlementOwner' => $this->walletSettlementOwner,
            'defaultNextDepositor'  => $this->defaultNextDepositor,
            'carryOverMaciek'       => round($this->carryOverMaciekMinor / 100, 2),
            'carryOverBasia'        => round($this->carryOverBasiaMinor / 100, 2),
        ];
    }

    public function isConfigured(): bool
    {
        return $this->settlementParty !== null && $this->homeBudgetWallet !== null;
    }

    public function getId(): ?int { return $this->id; }

    public function getUser(): ?User { return $this->user; }
    public function setUser(User $user): static { $this->user = $user; return $this; }

    public function getSettlementParty(): ?Party { return $this->settlementParty; }
    public function setSettlementParty(?Party $party): static { $this->settlementParty = $party; return $this; }

    public function getHomeBudgetWallet(): ?Wallet { return $this->homeBudgetWallet; }
    public function setHomeBudgetWallet(?Wallet $wallet): static { $this->homeBudgetWallet = $wallet; return $this; }

    public function getBaseDepositAmountMinor(): int { return $this->baseDepositAmountMinor; }
    public function setBaseDepositAmountMinor(int $v): static { $this->baseDepositAmountMinor = $v; return $this; }

    /** @return list<int> */
    public function getMaciekSourcePartyIds(): array { return $this->maciekSourcePartyIds; }

    /** @param list<int> $ids */
    public function setMaciekSourcePartyIds(array $ids): static
    {
        $this->maciekSourcePartyIds = array_values(array_unique(array_map('intval', $ids)));
        return $this;
    }

    /** @return list<int> */
    public function getBasiaSourcePartyIds(): array { return $this->basiaSourcePartyIds; }

    /** @param list<int> $ids */
    public function setBasiaSourcePartyIds(array $ids): static
    {
        $this->basiaSourcePartyIds = array_values(array_unique(array_map('intval', $ids)));
        return $this;
    }

    /** @return array<string, string> */
    public function getWalletSettlementOwner(): array { return $this->walletSettlementOwner; }

    /** @param array<string, string> $map */
    public function setWalletSettlementOwner(array $map): static { $this->walletSettlementOwner = $map; return $this; }

    public function getDefaultNextDepositor(): string { return $this->defaultNextDepositor; }
    public function setDefaultNextDepositor(string $v): static { $this->defaultNextDepositor = $v; return $this; }

    public function getCarryOverMaciekMinor(): int { return $this->carryOverMaciekMinor; }
    public function setCarryOverMaciekMinor(int $v): static { $this->carryOverMaciekMinor = $v; return $this; }

    public function getCarryOverBasiaMinor(): int { return $this->carryOverBasiaMinor; }
    public function setCarryOverBasiaMinor(int $v): static { $this->carryOverBasiaMinor = $v; return $this; }
}
