<?php

namespace App\Home\Report\Settlement\Entity;

use App\Home\Configuration\Entity\Wallet;
use App\Home\Transaction\Entity\TransactionItem;
use App\Identity\Entity\User;
use App\Home\Report\Settlement\Repository\SettlementLedgerRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: SettlementLedgerRepository::class)]
#[ORM\Table(name: 'settlement_ledger_entry')]
#[ORM\Index(name: 'idx_settlement_ledger_user_date', columns: ['user_id', 'operation_date', 'ledger_sequence'])]
class SettlementLedgerEntry
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'user_id', nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    #[ORM\OneToOne(targetEntity: TransactionItem::class)]
    #[ORM\JoinColumn(name: 'transaction_item_id', nullable: false, onDelete: 'CASCADE')]
    private ?TransactionItem $transactionItem = null;

    #[ORM\Column(name: 'operation_date', type: 'date_immutable')]
    private ?\DateTimeImmutable $operationDate = null;

    #[ORM\Column(name: 'ledger_sequence')]
    private int $ledgerSequence = 0;

    #[ORM\Column(name: 'entry_type', length: 20)]
    private string $entryType = '';

    #[ORM\Column(length: 10, nullable: true)]
    private ?string $person = null;

    #[ORM\ManyToOne(targetEntity: Wallet::class)]
    #[ORM\JoinColumn(name: 'wallet_id', nullable: true, onDelete: 'SET NULL')]
    private ?Wallet $wallet = null;

    #[ORM\Column(name: 'amount_minor')]
    private int $amountMinor = 0;

    #[ORM\Column(name: 'wallet_delta_minor')]
    private int $walletDeltaMinor = 0;

    /** @var array<string, int> */
    #[ORM\Column(name: 'wallet_balances_json', type: 'json')]
    private array $walletBalancesJson = [];

    #[ORM\Column(name: 'rotation_carry_minor')]
    private int $rotationCarryMinor = 0;

    #[ORM\Column(name: 'rotation_prepaid_maciek_minor')]
    private int $rotationPrepaidMaciekMinor = 0;

    #[ORM\Column(name: 'rotation_prepaid_basia_minor')]
    private int $rotationPrepaidBasiaMinor = 0;

    #[ORM\Column(name: 'maciek_deposits_total_minor')]
    private int $maciekDepositsTotalMinor = 0;

    #[ORM\Column(name: 'basia_deposits_total_minor')]
    private int $basiaDepositsTotalMinor = 0;

    #[ORM\Column(name: 'anchor', length: 10)]
    private string $anchor = SettlementConfig::DEPOSITOR_MACIEK;

    #[ORM\Column(name: 'suggested_amount_minor')]
    private int $suggestedAmountMinor = 0;

    #[ORM\Column(name: 'config_version', length: 64, nullable: true)]
    private ?string $configVersion = null;

    #[ORM\Column(name: 'created_at')]
    private ?\DateTimeImmutable $createdAt = null;

    public function getId(): ?int { return $this->id; }

    public function getUser(): ?User { return $this->user; }
    public function setUser(User $user): static { $this->user = $user; return $this; }

    public function getTransactionItem(): ?TransactionItem { return $this->transactionItem; }
    public function setTransactionItem(TransactionItem $item): static { $this->transactionItem = $item; return $this; }

    public function getOperationDate(): ?\DateTimeImmutable { return $this->operationDate; }
    public function setOperationDate(\DateTimeImmutable $d): static { $this->operationDate = $d; return $this; }

    public function getLedgerSequence(): int { return $this->ledgerSequence; }
    public function setLedgerSequence(int $v): static { $this->ledgerSequence = $v; return $this; }

    public function getEntryType(): string { return $this->entryType; }
    public function setEntryType(string $v): static { $this->entryType = $v; return $this; }

    public function getPerson(): ?string { return $this->person; }
    public function setPerson(?string $v): static { $this->person = $v; return $this; }

    public function getWallet(): ?Wallet { return $this->wallet; }
    public function setWallet(?Wallet $w): static { $this->wallet = $w; return $this; }

    public function getAmountMinor(): int { return $this->amountMinor; }
    public function setAmountMinor(int $v): static { $this->amountMinor = $v; return $this; }

    public function getWalletDeltaMinor(): int { return $this->walletDeltaMinor; }
    public function setWalletDeltaMinor(int $v): static { $this->walletDeltaMinor = $v; return $this; }

    /** @return array<string, int> */
    public function getWalletBalancesJson(): array { return $this->walletBalancesJson; }

    /** @param array<string, int> $v */
    public function setWalletBalancesJson(array $v): static { $this->walletBalancesJson = $v; return $this; }

    public function getRotationCarryMinor(): int { return $this->rotationCarryMinor; }
    public function setRotationCarryMinor(int $v): static { $this->rotationCarryMinor = $v; return $this; }

    public function getRotationPrepaidMaciekMinor(): int { return $this->rotationPrepaidMaciekMinor; }
    public function setRotationPrepaidMaciekMinor(int $v): static { $this->rotationPrepaidMaciekMinor = $v; return $this; }

    public function getRotationPrepaidBasiaMinor(): int { return $this->rotationPrepaidBasiaMinor; }
    public function setRotationPrepaidBasiaMinor(int $v): static { $this->rotationPrepaidBasiaMinor = $v; return $this; }

    public function getBasiaDepositsTotalMinor(): int { return $this->basiaDepositsTotalMinor; }
    public function setBasiaDepositsTotalMinor(int $v): static { $this->basiaDepositsTotalMinor = $v; return $this; }

    public function getMaciekDepositsTotalMinor(): int { return $this->maciekDepositsTotalMinor; }
    public function setMaciekDepositsTotalMinor(int $v): static { $this->maciekDepositsTotalMinor = $v; return $this; }

    public function getAnchor(): string { return $this->anchor; }
    public function setAnchor(string $v): static { $this->anchor = $v; return $this; }

    /** @deprecated użyj getAnchor() */
    public function getNextDepositor(): string { return $this->anchor; }

    /** @deprecated użyj setAnchor() */
    public function setNextDepositor(string $v): static { return $this->setAnchor($v); }

    public function getSuggestedAmountMinor(): int { return $this->suggestedAmountMinor; }
    public function setSuggestedAmountMinor(int $v): static { $this->suggestedAmountMinor = $v; return $this; }

    public function getConfigVersion(): ?string { return $this->configVersion; }
    public function setConfigVersion(?string $v): static { $this->configVersion = $v; return $this; }

    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }
    public function setCreatedAt(\DateTimeImmutable $v): static { $this->createdAt = $v; return $this; }
}
