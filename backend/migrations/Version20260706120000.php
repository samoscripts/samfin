<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Repair: brakująca migracja rename (historyczna Version20260627120000).
 * Idempotentna — bezpieczna gdy tabela już nazywa się settlement_config.
 */
final class Version20260706120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Repair: rename common_account_settlement_config → settlement_config; ledger + kolumny indeksu jeśli brak.';
    }

    public function up(Schema $schema): void
    {
        $sm = $this->connection->createSchemaManager();

        $hasOld = $schema->hasTable('common_account_settlement_config');
        $hasNew = $schema->hasTable('settlement_config');

        if ($hasOld && !$hasNew) {
            $this->addSql('RENAME TABLE common_account_settlement_config TO settlement_config');
        }

        if (!$hasOld && !$hasNew) {
            return;
        }

        $sourceTable = $hasNew ? 'settlement_config' : 'common_account_settlement_config';
        $configTable = $sm->introspectTable($sourceTable);

        if ($configTable->hasColumn('common_account_party_id') && !$configTable->hasColumn('settlement_party_id')) {
            if ($configTable->hasForeignKey('fk_settlement_config_common_party')) {
                $this->addSql('ALTER TABLE settlement_config DROP FOREIGN KEY fk_settlement_config_common_party');
            }

            $this->addSql(<<<'SQL'
                ALTER TABLE settlement_config
                    CHANGE common_account_party_id settlement_party_id INT DEFAULT NULL
                SQL);

            $this->addSql(<<<'SQL'
                ALTER TABLE settlement_config
                    ADD CONSTRAINT fk_settlement_config_settlement_party_id
                    FOREIGN KEY (settlement_party_id) REFERENCES party (id) ON DELETE SET NULL
                SQL);
        }

        if ($hasNew) {
            $configTable = $sm->introspectTable('settlement_config');
        } else {
            // Kolumny indeksu dodamy po rename — introspect starej tabeli (bez kolumn z 28120000).
            $configTable = $sm->introspectTable('common_account_settlement_config');
        }

        $add = [];

        if (!$configTable->hasColumn('reindex_from_date')) {
            $add[] = 'ADD reindex_from_date DATE DEFAULT NULL';
        }
        if (!$configTable->hasColumn('opening_wallet_balances_json')) {
            $add[] = 'ADD opening_wallet_balances_json JSON DEFAULT NULL';
        }
        if (!$configTable->hasColumn('opening_rotation_carry_minor')) {
            $add[] = 'ADD opening_rotation_carry_minor INT NOT NULL DEFAULT 0';
        }
        if (!$configTable->hasColumn('opening_rotation_prepaid_maciek_minor')) {
            $add[] = 'ADD opening_rotation_prepaid_maciek_minor INT NOT NULL DEFAULT 0';
        }
        if (!$configTable->hasColumn('opening_rotation_prepaid_basia_minor')) {
            $add[] = 'ADD opening_rotation_prepaid_basia_minor INT NOT NULL DEFAULT 0';
        }
        if (!$configTable->hasColumn('opening_next_depositor')) {
            $add[] = "ADD opening_next_depositor VARCHAR(10) NOT NULL DEFAULT 'maciek'";
        }
        if (!$configTable->hasColumn('needs_refresh')) {
            $add[] = 'ADD needs_refresh TINYINT(1) NOT NULL DEFAULT 1';
        }
        if (!$configTable->hasColumn('refresh_in_progress')) {
            $add[] = 'ADD refresh_in_progress TINYINT(1) NOT NULL DEFAULT 0';
        }
        if (!$configTable->hasColumn('last_refreshed_at')) {
            $add[] = 'ADD last_refreshed_at DATETIME DEFAULT NULL';
        }
        if (!$configTable->hasColumn('last_refresh_stats_json')) {
            $add[] = 'ADD last_refresh_stats_json JSON DEFAULT NULL';
        }
        if (!$configTable->hasColumn('config_version')) {
            $add[] = 'ADD config_version VARCHAR(64) DEFAULT NULL';
        }

        if ($add !== []) {
            $this->addSql('ALTER TABLE settlement_config ' . implode(', ', $add));
        }

        if ($schema->hasTable('settlement_ledger_entry')) {
            return;
        }

        $this->addSql(<<<'SQL'
            CREATE TABLE settlement_ledger_entry (
                id                              INT AUTO_INCREMENT NOT NULL,
                user_id                         INT NOT NULL,
                transaction_item_id             INT NOT NULL,
                operation_date                  DATE NOT NULL,
                ledger_sequence                 INT NOT NULL,
                entry_type                      VARCHAR(20) NOT NULL,
                person                          VARCHAR(10) DEFAULT NULL,
                wallet_id                       INT DEFAULT NULL,
                amount_minor                    INT NOT NULL,
                wallet_delta_minor              INT NOT NULL DEFAULT 0,
                wallet_balances_json            JSON NOT NULL,
                rotation_carry_minor            INT NOT NULL DEFAULT 0,
                rotation_prepaid_maciek_minor   INT NOT NULL DEFAULT 0,
                rotation_prepaid_basia_minor    INT NOT NULL DEFAULT 0,
                next_depositor                  VARCHAR(10) NOT NULL,
                suggested_amount_minor          INT NOT NULL DEFAULT 0,
                config_version                  VARCHAR(64) DEFAULT NULL,
                created_at                      DATETIME NOT NULL,
                PRIMARY KEY (id),
                UNIQUE INDEX uniq_settlement_ledger_item (transaction_item_id),
                INDEX idx_settlement_ledger_user_date (user_id, operation_date, ledger_sequence),
                CONSTRAINT fk_settlement_ledger_user
                    FOREIGN KEY (user_id) REFERENCES app_user (id) ON DELETE CASCADE,
                CONSTRAINT fk_settlement_ledger_item
                    FOREIGN KEY (transaction_item_id) REFERENCES transaction_items (id) ON DELETE CASCADE,
                CONSTRAINT fk_settlement_ledger_wallet
                    FOREIGN KEY (wallet_id) REFERENCES wallet (id) ON DELETE SET NULL
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
            SQL);
    }

    public function down(Schema $schema): void
    {
        // Repair migration — no down.
    }
}
