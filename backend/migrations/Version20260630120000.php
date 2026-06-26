<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Repair: Version20260627120000 was recorded without applying CSV format column DDL.
 */
final class Version20260630120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Repair: add csv_format and related import/transaction columns if missing.';
    }

    public function up(Schema $schema): void
    {
        $sm = $this->connection->createSchemaManager();

        if ($schema->hasTable('csv_import') && !$sm->introspectTable('csv_import')->hasColumn('csv_format')) {
            $this->addSql('ALTER TABLE csv_import ADD csv_format VARCHAR(40) DEFAULT NULL');
        }

        if ($schema->hasTable('csv_import_row')) {
            $rowTable = $sm->introspectTable('csv_import_row');
            $add = [];

            if (!$rowTable->hasColumn('csv_format')) {
                $add[] = 'ADD csv_format VARCHAR(40) DEFAULT NULL';
            }
            if (!$rowTable->hasColumn('booking_date')) {
                $add[] = 'ADD booking_date DATE DEFAULT NULL';
            }
            if (!$rowTable->hasColumn('operation_type_raw')) {
                $add[] = 'ADD operation_type_raw VARCHAR(255) DEFAULT NULL';
            }
            if (!$rowTable->hasColumn('title_raw')) {
                $add[] = 'ADD title_raw LONGTEXT DEFAULT NULL';
            }
            if (!$rowTable->hasColumn('title_clean')) {
                $add[] = 'ADD title_clean LONGTEXT DEFAULT NULL';
            }
            if (!$rowTable->hasColumn('counterparty_name_raw')) {
                $add[] = 'ADD counterparty_name_raw VARCHAR(512) DEFAULT NULL';
            }
            if (!$rowTable->hasColumn('balance_after_minor')) {
                $add[] = 'ADD balance_after_minor INT DEFAULT NULL';
            }

            if ($add !== []) {
                $this->addSql('ALTER TABLE csv_import_row ' . implode(', ', $add));
            }
        }

        if ($schema->hasTable('transactions')) {
            $txTable = $sm->introspectTable('transactions');
            $add = [];

            if (!$txTable->hasColumn('booking_date')) {
                $add[] = 'ADD booking_date DATE DEFAULT NULL';
            }
            if (!$txTable->hasColumn('operation_type')) {
                $add[] = 'ADD operation_type VARCHAR(255) DEFAULT NULL';
            }
            if (!$txTable->hasColumn('title')) {
                $add[] = 'ADD title LONGTEXT DEFAULT NULL';
            }
            if (!$txTable->hasColumn('counterparty_name')) {
                $add[] = 'ADD counterparty_name VARCHAR(512) DEFAULT NULL';
            }

            if ($add !== []) {
                $this->addSql('ALTER TABLE transactions ' . implode(', ', $add));
            }
        }
    }

    public function down(Schema $schema): void
    {
        // Repair migration — no down.
    }
}
