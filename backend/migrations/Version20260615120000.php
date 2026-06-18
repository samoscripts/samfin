<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260615120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Prepend direction condition to existing classification rules.';
    }

    public function up(Schema $schema): void
    {
        $rows = $this->connection->fetchAllAssociative(
            'SELECT id, party_id, conditions_json, actions_json FROM classification_rule WHERE active = 1',
        );

        foreach ($rows as $row) {
            $conditions = json_decode($row['conditions_json'] ?? '{}', true);
            if (!is_array($conditions)) {
                $conditions = ['conditions' => []];
            }
            $list = $conditions['conditions'] ?? [];
            if (!is_array($list)) {
                $list = [];
            }

            if ($this->hasDirectionCondition($list)) {
                continue;
            }

            $actions = json_decode($row['actions_json'] ?? '{}', true);
            $partyId = (int) $row['party_id'];
            $direction = $this->inferDirection($partyId, is_array($actions) ? $actions : []);

            $rest = array_values(array_filter(
                $list,
                static fn ($item) => !is_array($item) || ($item['field'] ?? '') !== 'direction',
            ));

            $conditions['conditions'] = [
                [
                    'field'    => 'direction',
                    'operator' => 'equals',
                    'value'    => $direction,
                ],
                ...$rest,
            ];

            $this->connection->update(
                'classification_rule',
                ['conditions_json' => json_encode($conditions, JSON_THROW_ON_ERROR)],
                ['id' => (int) $row['id']],
            );
        }
    }

    public function down(Schema $schema): void
    {
        $rows = $this->connection->fetchAllAssociative(
            'SELECT id, conditions_json FROM classification_rule WHERE active = 1',
        );

        foreach ($rows as $row) {
            $conditions = json_decode($row['conditions_json'] ?? '{}', true);
            if (!is_array($conditions)) {
                continue;
            }
            $list = $conditions['conditions'] ?? [];
            if (!is_array($list)) {
                continue;
            }

            $filtered = array_values(array_filter(
                $list,
                static fn ($item) => !is_array($item) || ($item['field'] ?? '') !== 'direction',
            ));

            if (count($filtered) === count($list)) {
                continue;
            }

            $conditions['conditions'] = $filtered;

            $this->connection->update(
                'classification_rule',
                ['conditions_json' => json_encode($conditions, JSON_THROW_ON_ERROR)],
                ['id' => (int) $row['id']],
            );
        }
    }

    /** @param array<int, mixed> $list */
    private function hasDirectionCondition(array $list): bool
    {
        foreach ($list as $item) {
            if (is_array($item) && ($item['field'] ?? '') === 'direction') {
                return true;
            }
        }

        return false;
    }

    /** @param array<string, mixed> $actions */
    private function inferDirection(int $partyId, array $actions): string
    {
        $tx = $actions['transaction'] ?? [];
        if (!is_array($tx)) {
            return 'EXPENSE';
        }

        $paidTo   = isset($tx['paidToPartyId']) ? (int) $tx['paidToPartyId'] : null;
        $paidFrom = isset($tx['paidFromPartyId']) ? (int) $tx['paidFromPartyId'] : null;

        if ($paidTo === $partyId) {
            return 'INCOME';
        }

        if ($paidFrom === $partyId) {
            return 'EXPENSE';
        }

        return 'EXPENSE';
    }
}
