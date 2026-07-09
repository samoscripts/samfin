<?php



namespace App\Home\Configuration\Rules\Service;



use App\Home\Configuration\Rules\ValueObject\RuleActionsDefinition;

use App\Home\Configuration\Rules\ValueObject\RuleItemAction;

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

        $totalMinor = $tx->getAmountMinor();

        $percents   = array_map(static fn (RuleItemAction $a) => $a->percent, $ruleItemActions);

        $amounts    = $this->allocateMinorFromPercents($totalMinor, $percents);

        $items      = [];



        foreach ($ruleItemActions as $i => $action) {

            $items[] = [

                'amount'      => round($amounts[$i] / 100, 2),

                'description' => $action->description,

                'walletId'    => $action->walletId,

                'concernId'   => $action->concernId,

                'categoryId'  => $action->categoryId,

            ];

        }



        $this->assertItemsSumMatchesTransaction($tx->getAmountMinor(), $items);



        return $items;

    }



    /**

     * @param int[] $percents

     * @return int[]

     */

    private function allocateMinorFromPercents(int $totalMinor, array $percents): array

    {

        if ($percents === []) {

            return [];

        }



        $sign     = $totalMinor < 0 ? -1 : ($totalMinor > 0 ? 1 : 1);

        $absTotal = abs($totalMinor);

        $amounts  = [];

        $assigned = 0;



        foreach ($percents as $i => $pct) {

            if ($i === count($percents) - 1) {

                $amounts[] = $sign * ($absTotal - $assigned);

            } else {

                $part      = (int) round($absTotal * $pct / 100);

                $amounts[] = $sign * $part;

                $assigned += $part;

            }

        }



        return $amounts;

    }



    /**

     * @param array<int, array<string, mixed>> $items

     */

    private function assertItemsSumMatchesTransaction(int $expectedMinor, array $items): void

    {

        $sumMinor = array_reduce(

            $items,

            fn (int $carry, array $item) => $carry + (int) round((float) ($item['amount'] ?? 0) * 100),

            0,

        );



        if ($sumMinor !== $expectedMinor) {

            throw new \InvalidArgumentException(sprintf(

                'Suma pozycji reguły (%d groszy) nie zgadza się z kwotą transakcji (%d groszy).',

                $sumMinor,

                $expectedMinor,

            ));

        }

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

