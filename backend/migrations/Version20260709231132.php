<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260709231132 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create transaction_filter_saved table for persisted transaction list filter presets.';
    }

    public function up(Schema $schema): void
    {
        if ($schema->hasTable('transaction_filter_saved')) {
            return;
        }

        $this->addSql('
            CREATE TABLE transaction_filter_saved (
                id INT AUTO_INCREMENT NOT NULL,
                user_id INT NOT NULL,
                name VARCHAR(200) NOT NULL,
                description LONGTEXT DEFAULT NULL,
                params_json JSON NOT NULL,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                PRIMARY KEY (id),
                UNIQUE INDEX uniq_transaction_filter_saved_user_name (user_id, name),
                INDEX idx_transaction_filter_saved_user_updated (user_id, updated_at),
                CONSTRAINT fk_transaction_filter_saved_user_id
                    FOREIGN KEY (user_id) REFERENCES app_user (id) ON DELETE CASCADE
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        ');
    }

    public function down(Schema $schema): void
    {
        if (!$schema->hasTable('transaction_filter_saved')) {
            return;
        }

        $this->addSql('DROP TABLE transaction_filter_saved');
    }
}
