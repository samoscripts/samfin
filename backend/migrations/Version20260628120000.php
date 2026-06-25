<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260628120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Settlement ledger index: settlement_ledger_entry + index state columns on settlement_config.';
    }

    public function up(Schema $schema): void
    {
        if (!$schema->hasTable('settlement_config')) {
            return;
        }

        $this->addSql('
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
        ');

        $this->addSql('ALTER TABLE settlement_config
            ADD reindex_from_date DATE DEFAULT NULL,
            ADD opening_wallet_balances_json JSON DEFAULT NULL,
            ADD opening_rotation_carry_minor INT NOT NULL DEFAULT 0,
            ADD opening_rotation_prepaid_maciek_minor INT NOT NULL DEFAULT 0,
            ADD opening_rotation_prepaid_basia_minor INT NOT NULL DEFAULT 0,
            ADD opening_next_depositor VARCHAR(10) NOT NULL DEFAULT \'maciek\',
            ADD needs_refresh TINYINT(1) NOT NULL DEFAULT 1,
            ADD refresh_in_progress TINYINT(1) NOT NULL DEFAULT 0,
            ADD last_refreshed_at DATETIME DEFAULT NULL,
            ADD last_refresh_stats_json JSON DEFAULT NULL,
            ADD config_version VARCHAR(64) DEFAULT NULL
        ');
    }

    public function down(Schema $schema): void
    {
        if ($schema->hasTable('settlement_ledger_entry')) {
            $this->addSql('DROP TABLE settlement_ledger_entry');
        }

        if (!$schema->hasTable('settlement_config')) {
            return;
        }

        $this->addSql('ALTER TABLE settlement_config
            DROP reindex_from_date,
            DROP opening_wallet_balances_json,
            DROP opening_rotation_carry_minor,
            DROP opening_rotation_prepaid_maciek_minor,
            DROP opening_rotation_prepaid_basia_minor,
            DROP opening_next_depositor,
            DROP needs_refresh,
            DROP refresh_in_progress,
            DROP last_refreshed_at,
            DROP last_refresh_stats_json,
            DROP config_version
        ');
    }
}
