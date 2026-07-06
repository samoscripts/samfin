<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Roczne okresy rozliczeniowe (ADR-038) — osobna migracja po Version20260710120000 (Model B).
 */
final class Version20260706133600 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Roczne okresy rozliczeniowe: tabela settlement_period.';
    }

    public function up(Schema $schema): void
    {
        if ($schema->hasTable('settlement_period')) {
            return;
        }

        $this->addSql('
            CREATE TABLE settlement_period (
                id                      INT AUTO_INCREMENT NOT NULL,
                user_id                 INT NOT NULL,
                year                    INT NOT NULL,
                date_from               DATE NOT NULL,
                date_to                 DATE NOT NULL,
                status                  VARCHAR(10) NOT NULL,
                closing_snapshot_json   JSON DEFAULT NULL,
                closed_at               DATETIME DEFAULT NULL,
                created_at              DATETIME NOT NULL,
                PRIMARY KEY (id),
                UNIQUE INDEX uniq_settlement_period_user_year (user_id, year),
                INDEX idx_settlement_period_user_status (user_id, status),
                CONSTRAINT fk_settlement_period_user
                    FOREIGN KEY (user_id) REFERENCES app_user (id) ON DELETE CASCADE
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        ');
    }

    public function down(Schema $schema): void
    {
        if ($schema->hasTable('settlement_period')) {
            $this->addSql('DROP TABLE settlement_period');
        }
    }
}
