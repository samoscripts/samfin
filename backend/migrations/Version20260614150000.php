<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260614150000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add classification_rule table and transactions.counterparty_account_number.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('
            CREATE TABLE classification_rule (
                id                            INT AUTO_INCREMENT NOT NULL,
                party_id                      INT NOT NULL,
                name                          VARCHAR(200) NOT NULL,
                description                   TEXT DEFAULT NULL,
                priority                      INT NOT NULL DEFAULT 100,
                enabled                       TINYINT(1) NOT NULL DEFAULT 1,
                stop_on_match                 TINYINT(1) NOT NULL DEFAULT 1,
                conditions_json               JSON NOT NULL,
                actions_json                  JSON NOT NULL,
                created_from_transaction_id   INT DEFAULT NULL,
                active                        TINYINT(1) NOT NULL DEFAULT 1,
                created_by                    INT NOT NULL,
                updated_by                    INT DEFAULT NULL,
                created_at                    DATETIME NOT NULL,
                updated_at                    DATETIME NOT NULL,
                PRIMARY KEY (id),
                INDEX idx_classification_rule_party (party_id, enabled, priority),
                CONSTRAINT fk_classification_rule_party
                    FOREIGN KEY (party_id) REFERENCES party (id) ON DELETE RESTRICT,
                CONSTRAINT fk_classification_rule_created_from_tx
                    FOREIGN KEY (created_from_transaction_id) REFERENCES transactions (id) ON DELETE SET NULL,
                CONSTRAINT fk_classification_rule_created_by
                    FOREIGN KEY (created_by) REFERENCES app_user (id),
                CONSTRAINT fk_classification_rule_updated_by
                    FOREIGN KEY (updated_by) REFERENCES app_user (id) ON DELETE SET NULL
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        ');

        $this->addSql('
            ALTER TABLE transactions
                ADD counterparty_account_number VARCHAR(26) DEFAULT NULL
        ');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE transactions DROP counterparty_account_number');
        $this->addSql('DROP TABLE classification_rule');
    }
}
