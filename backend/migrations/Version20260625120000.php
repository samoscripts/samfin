<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260625120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create common_account_settlement_config table for shared-account deposit settlement report.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('
            CREATE TABLE common_account_settlement_config (
                id                          INT AUTO_INCREMENT NOT NULL,
                user_id                     INT NOT NULL,
                common_account_party_id     INT DEFAULT NULL,
                home_budget_wallet_id       INT DEFAULT NULL,
                base_deposit_amount_minor   INT NOT NULL DEFAULT 500000,
                maciek_source_party_ids     JSON NOT NULL,
                basia_source_party_ids      JSON NOT NULL,
                wallet_settlement_owner     JSON NOT NULL,
                default_next_depositor      VARCHAR(10) NOT NULL DEFAULT \'maciek\',
                carry_over_maciek_minor     INT NOT NULL DEFAULT 0,
                carry_over_basia_minor      INT NOT NULL DEFAULT 0,
                created_at                  DATETIME NOT NULL,
                updated_at                  DATETIME NOT NULL,
                PRIMARY KEY (id),
                UNIQUE INDEX uniq_settlement_config_user (user_id),
                CONSTRAINT fk_settlement_config_user
                    FOREIGN KEY (user_id) REFERENCES app_user (id) ON DELETE CASCADE,
                CONSTRAINT fk_settlement_config_common_party
                    FOREIGN KEY (common_account_party_id) REFERENCES party (id) ON DELETE SET NULL,
                CONSTRAINT fk_settlement_config_home_wallet
                    FOREIGN KEY (home_budget_wallet_id) REFERENCES wallet (id) ON DELETE SET NULL
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        ');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE common_account_settlement_config');
    }
}
