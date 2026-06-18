<?php



namespace App\Home\Transaction\ClassificationRule\Mapper;



use App\Home\Transaction\ClassificationRule\ValueObject\RuleActionsDefinition;

use App\Home\Transaction\ClassificationRule\ValueObject\RuleCondition;

use App\Home\Transaction\ClassificationRule\ValueObject\RuleConditionsDefinition;

use App\Home\Transaction\ClassificationRule\ValueObject\RuleItemAction;

use App\Home\Transaction\ClassificationRule\ValueObject\RuleTransactionAction;



class ClassificationRuleJsonMapper

{

    private const ALLOWED_FIELDS = [

        'description',

        'direction',

        'amount_minor',

        'operation_date',

        'classification_status',

        'counterparty_account_number',

    ];



    private const ALLOWED_OPERATORS = [

        'equals',

        'not_equals',

        'contains',

        'not_contains',

        'starts_with',

        'ends_with',

        'greater_than',

        'greater_or_equal',

        'less_than',

        'less_or_equal',

        'between',

        'in',

        'not_in',

        'is_empty',

        'is_not_empty',

    ];



    /** @param array<string, mixed> $json */

    public function mapConditions(array $json): RuleConditionsDefinition

    {

        $raw = $json['conditions'] ?? null;

        if (!is_array($raw)) {

            throw new \InvalidArgumentException('conditions must be an object with a "conditions" array.');

        }



        $conditions = [];

        foreach ($raw as $i => $row) {

            if (!is_array($row)) {

                throw new \InvalidArgumentException("conditions[$i] must be an object.");

            }

            $field = $row['field'] ?? null;

            $operator = $row['operator'] ?? null;

            if (!is_string($field) || !in_array($field, self::ALLOWED_FIELDS, true)) {

                throw new \InvalidArgumentException("conditions[$i].field is invalid.");

            }

            if (!is_string($operator) || !in_array($operator, self::ALLOWED_OPERATORS, true)) {

                throw new \InvalidArgumentException("conditions[$i].operator is invalid.");

            }

            $conditions[] = new RuleCondition(

                field: $field,

                operator: $operator,

                value: $row['value'] ?? null,

                caseInsensitive: (bool) ($row['caseInsensitive'] ?? false),

            );

        }



        return new RuleConditionsDefinition($conditions);

    }



    /** @param array<string, mixed> $json */

    public function mapActions(array $json): RuleActionsDefinition

    {

        $txRaw = $json['transaction'] ?? [];

        if (!is_array($txRaw)) {

            throw new \InvalidArgumentException('actions.transaction must be an object.');

        }



        $transaction = new RuleTransactionAction(

            paidFromPartyId: isset($txRaw['paidFromPartyId']) ? (int) $txRaw['paidFromPartyId'] : null,

            paidToPartyId: isset($txRaw['paidToPartyId']) ? (int) $txRaw['paidToPartyId'] : null,

        );



        $itemsRaw = $json['items'] ?? [];

        if (!is_array($itemsRaw)) {

            throw new \InvalidArgumentException('actions.items must be an array.');

        }

        if (count($itemsRaw) < 1 || count($itemsRaw) > 2) {

            throw new \InvalidArgumentException('actions.items must contain 1–2 entries.');

        }



        $items = [];

        foreach ($itemsRaw as $i => $row) {

            if (!is_array($row)) {

                throw new \InvalidArgumentException("actions.items[$i] must be an object.");

            }

            if (array_key_exists('split', $row)) {

                throw new \InvalidArgumentException("actions.items[$i]: pole split nie jest już wspierane — użyj percent.");

            }

            if (!array_key_exists('percent', $row)) {

                throw new \InvalidArgumentException("actions.items[$i].percent is required.");

            }

            $percent = $row['percent'];

            if (!is_int($percent) && !(is_float($percent) && floor($percent) == $percent)) {

                throw new \InvalidArgumentException("actions.items[$i].percent must be an integer.");

            }

            $items[] = new RuleItemAction(

                percent: (int) $percent,

                walletId: isset($row['walletId']) ? (int) $row['walletId'] : null,

                concernId: isset($row['concernId']) ? (int) $row['concernId'] : null,

                categoryId: isset($row['categoryId']) ? (int) $row['categoryId'] : null,

                description: isset($row['description']) ? (string) $row['description'] : null,

            );

        }



        return new RuleActionsDefinition($transaction, $items);

    }



    public function conditionsToJson(RuleConditionsDefinition $def): array

    {

        return [

            'conditions' => array_map(static fn (RuleCondition $c) => [

                'field'             => $c->field,

                'operator'          => $c->operator,

                'value'             => $c->value,

                'caseInsensitive'   => $c->caseInsensitive,

            ], $def->conditions),

        ];

    }



    public function actionsToJson(RuleActionsDefinition $def): array

    {

        $tx = [];

        if ($def->transaction->paidFromPartyId !== null) {

            $tx['paidFromPartyId'] = $def->transaction->paidFromPartyId;

        }

        if ($def->transaction->paidToPartyId !== null) {

            $tx['paidToPartyId'] = $def->transaction->paidToPartyId;

        }



        return [

            'transaction' => $tx,

            'items'       => array_map(static fn (RuleItemAction $item) => array_filter([

                'percent'     => $item->percent,

                'walletId'    => $item->walletId,

                'concernId'   => $item->concernId,

                'categoryId'  => $item->categoryId,

                'description' => $item->description,

            ], static fn ($v) => $v !== null), $def->items),

        ];

    }

}

