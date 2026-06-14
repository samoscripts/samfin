<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260608120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create transactions_change_log table for transaction edit history snapshots.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('
            CREATE TABLE transactions_change_log (
                id              INT AUTO_INCREMENT NOT NULL,
                transaction_id  INT NOT NULL,
                snapshot_json   JSON NOT NULL,
                created_by      INT NOT NULL,
                created_at      DATETIME NOT NULL,
                PRIMARY KEY (id),
                INDEX idx_tx_change_log_transaction (transaction_id),
                INDEX idx_tx_change_log_created_at (created_at),
                CONSTRAINT fk_tx_change_log_transaction
                    FOREIGN KEY (transaction_id) REFERENCES transactions (id) ON DELETE CASCADE,
                CONSTRAINT fk_tx_change_log_created_by
                    FOREIGN KEY (created_by) REFERENCES app_user (id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        ');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE transactions_change_log');
    }
}
