<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260624120000 extends AbstractMigration
{
    private const RULE_NAME_MAX_LENGTH = 120;
    private const DESCRIPTION_CONDITION_MAX_LENGTH = 30;

    public function getDescription(): string
    {
        return 'Backfill classification rule name (category/subcategory) and description for rules created from transactions.';
    }

    public function up(Schema $schema): void
    {
        $rows = $this->connection->fetchAllAssociative(
            'SELECT id, conditions_json, created_from_transaction_id
             FROM classification_rule
             WHERE active = 1 AND created_from_transaction_id IS NOT NULL',
        );

        foreach ($rows as $row) {
            $txId = (int) $row['created_from_transaction_id'];
            $name = $this->resolveRuleNameFromTransaction($txId);
            $description = $this->resolveRuleDescription(
                json_decode($row['conditions_json'] ?? '{}', true),
                $txId,
            );

            $this->connection->update(
                'classification_rule',
                [
                    'name'        => $name,
                    'description' => $description,
                ],
                ['id' => (int) $row['id']],
            );
        }
    }

    public function down(Schema $schema): void
    {
        // Data migration — no rollback.
    }

    private function resolveRuleNameFromTransaction(int $transactionId): string
    {
        $categoryId = $this->connection->fetchOne(
            'SELECT category_id FROM transaction_items
             WHERE transaction_id = :txId AND category_id IS NOT NULL
             ORDER BY id ASC
             LIMIT 1',
            ['txId' => $transactionId],
        );

        if ($categoryId === false || $categoryId === null) {
            return sprintf('Reguła z transakcji #%d', $transactionId);
        }

        $row = $this->connection->fetchAssociative(
            'SELECT c.name, p.name AS parent_name
             FROM category c
             LEFT JOIN category p ON c.parent_id = p.id
             WHERE c.id = :id',
            ['id' => (int) $categoryId],
        );

        if ($row === false) {
            return sprintf('Reguła z transakcji #%d', $transactionId);
        }

        $name = $row['name'] ?? '';
        if ($name === '') {
            return sprintf('Reguła z transakcji #%d', $transactionId);
        }

        $parentName = $row['parent_name'] ?? null;
        if (is_string($parentName) && $parentName !== '') {
            $name = $parentName . '/' . $name;
        }

        return mb_substr($name, 0, self::RULE_NAME_MAX_LENGTH);
    }

    /**
     * @param mixed $conditionsJson
     */
    private function resolveRuleDescription(mixed $conditionsJson, int $transactionId): ?string
    {
        $fromConditions = $this->extractDescriptionConditionValue($conditionsJson);
        if ($fromConditions !== null) {
            return $fromConditions;
        }

        $txDescription = $this->connection->fetchOne(
            'SELECT description FROM transactions WHERE id = :id',
            ['id' => $transactionId],
        );

        if (!is_string($txDescription) || $txDescription === '') {
            return null;
        }

        return mb_substr($txDescription, 0, self::DESCRIPTION_CONDITION_MAX_LENGTH);
    }

    /** @param mixed $conditionsJson */
    private function extractDescriptionConditionValue(mixed $conditionsJson): ?string
    {
        if (!is_array($conditionsJson)) {
            return null;
        }

        $list = $conditionsJson['conditions'] ?? [];
        if (!is_array($list)) {
            return null;
        }

        foreach ($list as $item) {
            if (!is_array($item) || ($item['field'] ?? '') !== 'description') {
                continue;
            }
            $value = $item['value'] ?? null;
            if (!is_string($value) || $value === '') {
                return null;
            }

            return mb_substr($value, 0, self::DESCRIPTION_CONDITION_MAX_LENGTH);
        }

        return null;
    }
}
