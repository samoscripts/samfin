<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260629120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create transactions_trash table for soft-delete snapshots before hard DELETE.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('
            CREATE TABLE transactions_trash (
                id                      INT AUTO_INCREMENT NOT NULL,
                original_transaction_id INT NOT NULL,
                snapshot_json           JSON NOT NULL,
                deleted_at              DATETIME NOT NULL,
                deleted_by              INT NOT NULL,
                PRIMARY KEY (id),
                INDEX idx_transactions_trash_deleted_at (deleted_at),
                INDEX idx_transactions_trash_original_id (original_transaction_id),
                CONSTRAINT fk_transactions_trash_deleted_by
                    FOREIGN KEY (deleted_by) REFERENCES app_user (id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        ');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE transactions_trash');
    }
}
