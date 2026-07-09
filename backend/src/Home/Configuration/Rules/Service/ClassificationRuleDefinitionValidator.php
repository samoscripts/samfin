<?php



namespace App\Home\Configuration\Rules\Service;



use App\Home\Configuration\Rules\Mapper\ClassificationRuleJsonMapper;

use App\Home\Configuration\Rules\ValueObject\RuleActionsDefinition;



class ClassificationRuleDefinitionValidator

{

    public function __construct(
        private ClassificationRuleJsonMapper $mapper,
        private ClassificationRuleConditionsNormalizer $conditionsNormalizer,
    ) {}



    /** @param array<string, mixed> $conditionsJson */

    public function validateConditions(array $conditionsJson): void
    {
        $this->conditionsNormalizer->validateRequiredDirection($conditionsJson);
        $this->mapper->mapConditions($conditionsJson);
    }

    /**
     * @param array<string, mixed> $conditionsJson
     * @return array<string, mixed>
     */
    public function normalizeConditions(array $conditionsJson, ?string $fallbackDirection = null): array
    {
        $normalized = $this->conditionsNormalizer->normalize($conditionsJson, $fallbackDirection);
        $this->mapper->mapConditions($normalized);

        return $normalized;
    }

    /** @param array<string, mixed> $actionsJson */
    public function inferDirectionFromActions(int $partyId, array $actionsJson): string
    {
        return $this->conditionsNormalizer->inferDirectionFromActions($partyId, $actionsJson);
    }



    /** @param array<string, mixed> $actionsJson */

    public function validateActions(array $actionsJson): RuleActionsDefinition

    {

        $actions = $this->mapper->mapActions($actionsJson);

        $this->validateItemPercents($actions);



        return $actions;

    }



    private function validateItemPercents(RuleActionsDefinition $actions): void

    {

        $itemCount = count($actions->items);

        if ($itemCount < 1) {

            throw new \InvalidArgumentException('Wymagana co najmniej 1 pozycja w akcjach.');

        }

        if ($itemCount > 2) {

            throw new \InvalidArgumentException('Maksymalnie 2 pozycje w akcjach reguły.');

        }



        $percentSum = 0;



        foreach ($actions->items as $i => $item) {

            $percent = $item->percent;

            if ($percent < 1 || $percent > 100) {

                throw new \InvalidArgumentException(sprintf('Pozycja %d: procent musi być z zakresu 1–100.', $i + 1));

            }

            $percentSum += $percent;

        }



        if ($percentSum !== 100) {

            throw new \InvalidArgumentException('Suma procentów pozycji musi wynosić 100.');

        }

    }

}

