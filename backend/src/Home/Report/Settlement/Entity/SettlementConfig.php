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

    #[ORM\Column(name: 'reindex_from_date', type: 'date_immutable', nullable: true)]
    private ?\DateTimeImmutable $reindexFromDate = null;

    /** @var array<string, int>|null walletId => balance_minor */
    #[ORM\Column(name: 'opening_wallet_balances_json', type: 'json', nullable: true)]
    private ?array $openingWalletBalancesJson = null;

    #[ORM\Column(name: 'opening_rotation_carry_minor')]
    private int $openingRotationCarryMinor = 0;

    #[ORM\Column(name: 'opening_rotation_prepaid_maciek_minor')]
    private int $openingRotationPrepaidMaciekMinor = 0;

    #[ORM\Column(name: 'opening_rotation_prepaid_basia_minor')]
    private int $openingRotationPrepaidBasiaMinor = 0;

    #[ORM\Column(name: 'opening_next_depositor', length: 10)]
    private string $openingNextDepositor = self::DEPOSITOR_MACIEK;

    #[ORM\Column(name: 'needs_refresh')]
    private bool $needsRefresh = true;

    #[ORM\Column(name: 'refresh_in_progress')]
    private bool $refreshInProgress = false;

    #[ORM\Column(name: 'last_refreshed_at', nullable: true)]
    private ?\DateTimeImmutable $lastRefreshedAt = null;

    /** @var array<string, mixed>|null */
    #[ORM\Column(name: 'last_refresh_stats_json', type: 'json', nullable: true)]
    private ?array $lastRefreshStatsJson = null;

    #[ORM\Column(name: 'config_version', length: 64, nullable: true)]
    private ?string $configVersion = null;

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
            'reindexFromDate'       => $this->reindexFromDate?->format('Y-m-d'),
            'openingWalletBalances' => $this->openingWalletBalancesToApi(),
            'openingRotationCarry'  => 0,
            'openingRotationPrepaidMaciek' => round($this->openingRotationPrepaidMaciekMinor / 100, 2),
            'openingRotationPrepaidBasia'  => round($this->openingRotationPrepaidBasiaMinor / 100, 2),
            'openingNextDepositor'  => $this->openingNextDepositor,
            'needsRefresh'          => $this->needsRefresh,
            'refreshInProgress'     => $this->refreshInProgress,
            'lastRefreshedAt'       => $this->lastRefreshedAt?->format(\DateTimeInterface::ATOM),
            'lastRefreshStats'      => $this->lastRefreshStatsJson,
            'configVersion'         => $this->configVersion,
        ];
    }

    /** @return array<string, float> */
    private function openingWalletBalancesToApi(): array
    {
        $result = [];
        foreach ($this->getOpeningWalletBalancesJson() as $walletId => $minor) {
            $result[(string) $walletId] = round((int) $minor / 100, 2);
        }

        return $result;
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

    public function getReindexFromDate(): ?\DateTimeImmutable { return $this->reindexFromDate; }
    public function setReindexFromDate(?\DateTimeImmutable $d): static { $this->reindexFromDate = $d; return $this; }

    /** @return array<string, int> */
    public function getOpeningWalletBalancesJson(): array
    {
        return $this->openingWalletBalancesJson ?? [];
    }

    /** @param array<string, int> $v */
    public function setOpeningWalletBalancesJson(array $v): static { $this->openingWalletBalancesJson = $v; return $this; }

    public function getOpeningRotationCarryMinor(): int { return $this->openingRotationCarryMinor; }
    public function setOpeningRotationCarryMinor(int $v): static { $this->openingRotationCarryMinor = $v; return $this; }

    public function getOpeningRotationPrepaidMaciekMinor(): int { return $this->openingRotationPrepaidMaciekMinor; }
    public function setOpeningRotationPrepaidMaciekMinor(int $v): static { $this->openingRotationPrepaidMaciekMinor = $v; return $this; }

    public function getOpeningRotationPrepaidBasiaMinor(): int { return $this->openingRotationPrepaidBasiaMinor; }
    public function setOpeningRotationPrepaidBasiaMinor(int $v): static { $this->openingRotationPrepaidBasiaMinor = $v; return $this; }

    public function getOpeningNextDepositor(): string { return $this->openingNextDepositor; }
    public function setOpeningNextDepositor(string $v): static { $this->openingNextDepositor = $v; return $this; }

    public function isNeedsRefresh(): bool { return $this->needsRefresh; }
    public function setNeedsRefresh(bool $v): static { $this->needsRefresh = $v; return $this; }

    public function isRefreshInProgress(): bool { return $this->refreshInProgress; }
    public function setRefreshInProgress(bool $v): static { $this->refreshInProgress = $v; return $this; }

    public function getLastRefreshedAt(): ?\DateTimeImmutable { return $this->lastRefreshedAt; }
    public function setLastRefreshedAt(?\DateTimeImmutable $v): static { $this->lastRefreshedAt = $v; return $this; }

    /** @return array<string, mixed>|null */
    public function getLastRefreshStatsJson(): ?array { return $this->lastRefreshStatsJson; }

    /** @param array<string, mixed>|null $v */
    public function setLastRefreshStatsJson(?array $v): static { $this->lastRefreshStatsJson = $v; return $this; }

    public function getConfigVersion(): ?string { return $this->configVersion; }
    public function setConfigVersion(?string $v): static { $this->configVersion = $v; return $this; }
}
