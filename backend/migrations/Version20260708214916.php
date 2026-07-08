<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260708214916 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create report_saved table for persisted Trend/Breakdown report parameters.';
    }

    public function up(Schema $schema): void
    {
        if ($schema->hasTable('report_saved')) {
            return;
        }

        $this->addSql('
            CREATE TABLE report_saved (
                id INT AUTO_INCREMENT NOT NULL,
                user_id INT NOT NULL,
                type VARCHAR(20) NOT NULL,
                name VARCHAR(200) NOT NULL,
                description LONGTEXT DEFAULT NULL,
                params_json JSON NOT NULL,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                PRIMARY KEY (id),
                UNIQUE INDEX uniq_report_saved_user_type_name (user_id, type, name),
                INDEX idx_report_saved_user_type_updated (user_id, type, updated_at),
                CONSTRAINT fk_report_saved_user_id
                    FOREIGN KEY (user_id) REFERENCES app_user (id) ON DELETE CASCADE
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        ');
    }

    public function down(Schema $schema): void
    {
        if (!$schema->hasTable('report_saved')) {
            return;
        }

        $this->addSql('DROP TABLE report_saved');
    }
}
