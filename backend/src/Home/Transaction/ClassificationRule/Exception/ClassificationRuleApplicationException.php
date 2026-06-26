<?php

namespace App\Home\Transaction\ClassificationRule\Exception;

use App\Home\Configuration\Entity\Party;
use App\Home\Transaction\ClassificationRule\Entity\ClassificationRule;
use App\Home\Transaction\ClassificationRule\ValueObject\RuleActionsDefinition;
use App\Home\Transaction\Entity\Transaction;
use Doctrine\ORM\EntityManagerInterface;

class ClassificationRuleApplicationException extends \InvalidArgumentException
{
    /** @param array<string, mixed> $context */
    private function __construct(
        string $message,
        private readonly array $context,
        ?\Throwable $previous = null,
    ) {
        parent::__construct($message, 0, $previous);
    }

    public static function fromFailure(
        Transaction $tx,
        ClassificationRule $rule,
        RuleActionsDefinition $actions,
        array $payload,
        \InvalidArgumentException $previous,
        EntityManagerInterface $em,
    ): self {
        $context = self::buildContext($tx, $rule, $actions, $payload, $previous->getMessage(), $em);
        $message = self::buildMessage($context);

        return new self($message, $context, $previous);
    }

    /** @return array<string, mixed> */
    public function getContext(): array
    {
        return $this->context;
    }

    /**
     * @param array{paidFromPartyId: ?int, paidToPartyId: ?int, items: array<int, array<string, mixed>>} $payload
     * @return array<string, mixed>
     */
    private static function buildContext(
        Transaction $tx,
        ClassificationRule $rule,
        RuleActionsDefinition $actions,
        array $payload,
        string $cause,
        EntityManagerInterface $em,
    ): array {
        $importRow = $tx->getImportRow();

        return [
            'type' => 'classification_rule',
            'cause' => $cause,
            'rule' => [
                'id'          => $rule->getId(),
                'name'        => $rule->getName(),
                'priority'    => $rule->getPriority(),
                'partyId'     => $rule->getParty()?->getId(),
                'partyName'   => $rule->getParty()?->getName(),
                'conditions'  => $rule->getConditionsJson(),
                'actions'     => $rule->getActionsJson(),
            ],
            'transaction' => [
                'lineNo'        => $importRow?->getLineNo(),
                'transTitle'    => $tx->getTransTitle(),
                'transDescription' => $tx->getTransDescription(),
                'transDate'     => $tx->getTransDate()?->format('Y-m-d'),
                'direction'     => $tx->getDirection(),
                'amountMinor'   => $tx->getAmountMinor(),
                'source'        => $tx->getSource(),
            ],
            'assignment' => [
                'before' => [
                    'paidFrom' => self::partyLabel($tx->getPaidFromParty()),
                    'paidTo'   => self::partyLabel($tx->getPaidToParty()),
                ],
                'ruleRequested' => [
                    'paidFrom' => self::partyLabelById($actions->transaction->paidFromPartyId, $em),
                    'paidTo'   => self::partyLabelById($actions->transaction->paidToPartyId, $em),
                ],
                'afterMerge' => [
                    'paidFrom' => self::partyLabelById($payload['paidFromPartyId'], $em),
                    'paidTo'   => self::partyLabelById($payload['paidToPartyId'], $em),
                ],
            ],
        ];
    }

    /** @param array<string, mixed> $context */
    private static function buildMessage(array $context): string
    {
        $lines = ['Nie udało się zastosować reguły klasyfikacji.'];

        $tx = $context['transaction'];
        if ($tx['lineNo'] !== null) {
            $lines[] = sprintf('Wiersz CSV: %d', $tx['lineNo']);
        }

        $lines[] = sprintf(
            'Transakcja: %s, „%s”, %s %s',
            $tx['transDate'] ?? '—',
            self::formatTransactionLabel($tx),
            self::directionLabel($tx['direction'] ?? ''),
            self::formatAmount($tx['amountMinor'] ?? 0),
        );

        $rule = $context['rule'];
        $lines[] = sprintf(
            'Reguła: #%s „%s” (priorytet %d, podmiot reguły: %s)',
            $rule['id'] ?? '—',
            $rule['name'],
            $rule['priority'],
            self::formatPartyRef($rule['partyName'], $rule['partyId']),
        );

        $requested = $context['assignment']['ruleRequested'];
        $lines[] = sprintf(
            'Akcje reguły — Skąd: %s, Dokąd: %s',
            self::formatPartyRefFromArray($requested['paidFrom']),
            self::formatPartyRefFromArray($requested['paidTo']),
        );

        $before = $context['assignment']['before'];
        $lines[] = sprintf(
            'Stan przed regułą — Skąd: %s, Dokąd: %s',
            self::formatPartyRefFromArray($before['paidFrom']),
            self::formatPartyRefFromArray($before['paidTo']),
        );

        $after = $context['assignment']['afterMerge'];
        $lines[] = sprintf(
            'Po scaleniu z regułą — Skąd: %s, Dokąd: %s',
            self::formatPartyRefFromArray($after['paidFrom']),
            self::formatPartyRefFromArray($after['paidTo']),
        );

        $lines[] = 'Błąd: ' . $context['cause'];

        return implode("\n", $lines);
    }

    /** @return array{id: int, name: string}|null */
    private static function partyLabel(?Party $party): ?array
    {
        if ($party === null) {
            return null;
        }

        return ['id' => $party->getId(), 'name' => $party->getName()];
    }

    /** @return array{id: int, name: ?string}|null */
    private static function partyLabelById(?int $id, EntityManagerInterface $em): ?array
    {
        if ($id === null) {
            return null;
        }

        $party = $em->find(Party::class, $id);

        return [
            'id'   => $id,
            'name' => $party?->getName(),
        ];
    }

    private static function formatPartyRef(?string $name, int|string|null $id): string
    {
        if ($id === null) {
            return '(brak)';
        }

        if ($name === null || $name === '') {
            return sprintf('id=%s', $id);
        }

        return sprintf('%s (id=%s)', $name, $id);
    }

    /** @param array{id?: int, name?: ?string}|null $party */
    private static function formatPartyRefFromArray(?array $party): string
    {
        if ($party === null) {
            return '(brak)';
        }

        return self::formatPartyRef($party['name'] ?? null, $party['id'] ?? null);
    }

    private static function directionLabel(string $direction): string
    {
        return match ($direction) {
            Transaction::DIRECTION_EXPENSE => 'wydatek',
            Transaction::DIRECTION_INCOME  => 'wpływ',
            default                          => $direction !== '' ? $direction : '—',
        };
    }

    private static function formatAmount(int $amountMinor): string
    {
        $sign = $amountMinor < 0 ? '−' : '';
        $abs  = abs($amountMinor);

        return sprintf('%s%s,%02d zł', $sign, intdiv($abs, 100), $abs % 100);
    }

    /** @param array<string, mixed> $tx */
    private static function formatTransactionLabel(array $tx): string
    {
        $title = $tx['transTitle'] ?? null;
        if (is_string($title) && trim($title) !== '') {
            return $title;
        }

        $desc = $tx['transDescription'] ?? null;
        if (is_string($desc) && trim($desc) !== '') {
            return $desc;
        }

        return '—';
    }
}
