<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260607200000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create csv_import, csv_import_row and csv_import_error tables.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('
            CREATE TABLE csv_import (
                id                       INT AUTO_INCREMENT NOT NULL,
                source                   VARCHAR(30) NOT NULL,
                status                   VARCHAR(20) NOT NULL,
                original_filename        VARCHAR(255) DEFAULT NULL,
                file_sha256              VARCHAR(64) DEFAULT NULL,
                period_from              DATETIME DEFAULT NULL,
                period_to                DATETIME DEFAULT NULL,
                detected_client_name     VARCHAR(255) DEFAULT NULL,
                detected_account_number  VARCHAR(50) DEFAULT NULL,
                detected_account_display VARCHAR(100) DEFAULT NULL,
                party_bank_account_id    INT DEFAULT NULL,
                party_id                 INT DEFAULT NULL,
                rows_total               INT NOT NULL DEFAULT 0,
                rows_parsed              INT NOT NULL DEFAULT 0,
                rows_invalid             INT NOT NULL DEFAULT 0,
                error_summary            LONGTEXT DEFAULT NULL,
                created_by               INT NOT NULL,
                updated_by               INT DEFAULT NULL,
                created_at               DATETIME NOT NULL,
                updated_at               DATETIME NOT NULL,
                PRIMARY KEY(id),
                INDEX IDX_csv_import_pba (party_bank_account_id),
                INDEX IDX_csv_import_party (party_id),
                INDEX IDX_csv_import_cb (created_by),
                INDEX IDX_csv_import_ub (updated_by),
                CONSTRAINT FK_csv_import_pba    FOREIGN KEY (party_bank_account_id) REFERENCES party_bank_account (id) ON DELETE SET NULL,
                CONSTRAINT FK_csv_import_party  FOREIGN KEY (party_id)              REFERENCES party (id) ON DELETE SET NULL,
                CONSTRAINT FK_csv_import_cb     FOREIGN KEY (created_by)            REFERENCES app_user (id),
                CONSTRAINT FK_csv_import_ub     FOREIGN KEY (updated_by)            REFERENCES app_user (id) ON DELETE SET NULL
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        ');

        $this->addSql('
            CREATE TABLE csv_import_row (
                id               INT AUTO_INCREMENT NOT NULL,
                csv_import_id    INT NOT NULL,
                line_no          INT NOT NULL,
                operation_date   DATETIME DEFAULT NULL,
                description_raw  LONGTEXT DEFAULT NULL,
                account_raw      VARCHAR(255) DEFAULT NULL,
                bank_category_raw VARCHAR(255) DEFAULT NULL,
                amount_raw       VARCHAR(50) DEFAULT NULL,
                amount_minor     INT DEFAULT NULL,
                parse_status     VARCHAR(20) NOT NULL DEFAULT \'OK\',
                parse_error      LONGTEXT DEFAULT NULL,
                created_at       DATETIME NOT NULL,
                PRIMARY KEY(id),
                INDEX IDX_csv_import_row_import (csv_import_id),
                CONSTRAINT FK_csv_import_row_import FOREIGN KEY (csv_import_id) REFERENCES csv_import (id) ON DELETE CASCADE
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        ');

        $this->addSql('
            CREATE TABLE csv_import_error (
                id            INT AUTO_INCREMENT NOT NULL,
                csv_import_id INT NOT NULL,
                scope         VARCHAR(10) NOT NULL,
                line_no       INT DEFAULT NULL,
                code          VARCHAR(50) NOT NULL,
                message       LONGTEXT NOT NULL,
                created_at    DATETIME NOT NULL,
                PRIMARY KEY(id),
                INDEX IDX_csv_import_error_import (csv_import_id),
                CONSTRAINT FK_csv_import_error_import FOREIGN KEY (csv_import_id) REFERENCES csv_import (id) ON DELETE CASCADE
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        ');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE csv_import_error');
        $this->addSql('DROP TABLE csv_import_row');
        $this->addSql('DROP TABLE csv_import');
    }
}
