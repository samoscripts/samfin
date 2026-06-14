<?php

namespace App\Home\Transaction\ClassificationRule\Service;

use App\Home\Transaction\ClassificationRule\ValueObject\RuleActionsDefinition;
use App\Home\Transaction\ClassificationRule\ValueObject\RuleItemAction;
use App\Home\Transaction\Entity\Transaction;
use App\Home\Transaction\Entity\TransactionItem;
use App\Home\Transaction\Service\TransactionPartyAssignmentValidator;

class ClassificationRulePayloadMerger
{
    public function __construct(
        private TransactionPartyAssignmentValidator $partyValidator,
    ) {}

    /**
     * @return array{paidFromPartyId: ?int, paidToPartyId: ?int, items: array<int, array<string, mixed>>}
     */
    public function buildClassifyPayload(
        Transaction            $tx,
        RuleActionsDefinition  $actions,
        bool                   $overwrite,
    ): array {
        $paidFromId = $this->resolvePartyId(
            $tx,
            TransactionPartyAssignmentValidator::FIELD_PAID_FROM,
            $actions->transaction->paidFromPartyId,
            $tx->getPaidFromParty()?->getId(),
            $overwrite,
        );
        $paidToId = $this->resolvePartyId(
            $tx,
            TransactionPartyAssignmentValidator::FIELD_PAID_TO,
            $actions->transaction->paidToPartyId,
            $tx->getPaidToParty()?->getId(),
            $overwrite,
        );

        $ruleItems = $this->buildRuleItems($tx, $actions->items);

        if ($overwrite || $this->isItemsBlank($tx)) {
            $items = $ruleItems;
        } else {
            $items = $this->mergeItems($tx, $ruleItems);
        }

        return [
            'paidFromPartyId' => $paidFromId,
            'paidToPartyId'   => $paidToId,
            'items'           => $items,
        ];
    }

    private function resolvePartyId(
        Transaction $tx,
        string      $field,
        ?int        $rulePartyId,
        ?int        $currentPartyId,
        bool        $overwrite,
    ): ?int {
        if ($this->partyValidator->isOwnSideLocked($tx, $field)) {
            return $currentPartyId;
        }

        if ($rulePartyId === null) {
            return $currentPartyId;
        }

        if ($overwrite || $currentPartyId === null) {
            return $rulePartyId;
        }

        return $currentPartyId;
    }

    /** @param RuleItemAction[] $ruleItemActions */
    private function buildRuleItems(Transaction $tx, array $ruleItemActions): array
    {
        $totalMinor    = $tx->getAmountMinor();
        $amounts       = $this->computeSplitAmounts($totalMinor, $ruleItemActions);
        $items         = [];

        foreach ($ruleItemActions as $i => $action) {
            $items[] = [
                'amount'      => round($amounts[$i] / 100, 2),
                'description' => $action->description,
                'walletId'    => $action->walletId,
                'concernId'   => $action->concernId,
                'categoryId'  => $action->categoryId,
            ];
        }

        return $items;
    }

    /**
     * @param RuleItemAction[] $ruleItemActions
     * @return int[]
     */
    private function computeSplitAmounts(int $totalMinor, array $ruleItemActions): array
    {
        $count      = count($ruleItemActions);
        $amounts    = array_fill(0, $count, 0);
        $assigned   = 0;
        $remainderI = null;

        foreach ($ruleItemActions as $i => $action) {
            if ($action->split->type === 'FULL') {
                $amounts[$i] = $totalMinor;

                return $amounts;
            }
            if ($action->split->type === 'REMAINDER') {
                $remainderI = $i;
                continue;
            }
            if ($action->split->type === 'PERCENT') {
                $pct           = $action->split->value ?? 0;
                $amounts[$i]   = (int) round($totalMinor * $pct / 100);
                $assigned     += $amounts[$i];
            }
        }

        if ($remainderI !== null) {
            $amounts[$remainderI] = $totalMinor - $assigned;
        }

        return $amounts;
    }

    private function isItemsBlank(Transaction $tx): bool
    {
        $items = $tx->getItems();
        if ($items->count() !== 1) {
            return false;
        }

        /** @var TransactionItem $item */
        $item = $items->first();

        return $item->getWallet() === null
            && $item->getConcern() === null
            && $item->getCategory() === null
            && ($item->getDescription() === null || $item->getDescription() === '');
    }

    /**
     * @param array<int, array<string, mixed>> $ruleItems
     * @return array<int, array<string, mixed>>
     */
    private function mergeItems(Transaction $tx, array $ruleItems): array
    {
        $existing = array_values($tx->getItems()->toArray());
        $merged   = [];

        foreach ($existing as $i => $item) {
            $rule = $ruleItems[$i] ?? null;
            $merged[] = [
                'amount'      => round($item->getAmountMinor() / 100, 2),
                'description' => $item->getDescription() ?? $rule['description'] ?? null,
                'walletId'    => $item->getWallet()?->getId() ?? $rule['walletId'] ?? null,
                'concernId'   => $item->getConcern()?->getId() ?? $rule['concernId'] ?? null,
                'categoryId'  => $item->getCategory()?->getId() ?? $rule['categoryId'] ?? null,
            ];
        }

        return $merged;
    }
}
