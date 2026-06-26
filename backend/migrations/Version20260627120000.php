<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * mBank CSV: kanoniczne pola importu + nowe kolumny transakcji.
 * Czysty start reguł klasyfikacji — użytkownik tworzy je ponownie po imporcie.
 */
final class Version20260627120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'CSV format mappers: csv_format, booking/title/counterparty columns; reset classification_rule.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('DELETE FROM classification_rule');

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
        $txTable = $schema->getTable('transactions');
        if ($txTable->hasColumn('counterparty_name')) {
            $this->addSql('ALTER TABLE transactions DROP counterparty_name');
        }
        if ($txTable->hasColumn('title')) {
            $this->addSql('ALTER TABLE transactions DROP title');
        }
        if ($txTable->hasColumn('operation_type')) {
            $this->addSql('ALTER TABLE transactions DROP operation_type');
        }
        if ($txTable->hasColumn('booking_date')) {
            $this->addSql('ALTER TABLE transactions DROP booking_date');
        }

        $rowTable = $schema->getTable('csv_import_row');
        if ($rowTable->hasColumn('balance_after_minor')) {
            $this->addSql('ALTER TABLE csv_import_row DROP balance_after_minor');
        }
        if ($rowTable->hasColumn('counterparty_name_raw')) {
            $this->addSql('ALTER TABLE csv_import_row DROP counterparty_name_raw');
        }
        if ($rowTable->hasColumn('title_clean')) {
            $this->addSql('ALTER TABLE csv_import_row DROP title_clean');
        }
        if ($rowTable->hasColumn('title_raw')) {
            $this->addSql('ALTER TABLE csv_import_row DROP title_raw');
        }
        if ($rowTable->hasColumn('operation_type_raw')) {
            $this->addSql('ALTER TABLE csv_import_row DROP operation_type_raw');
        }
        if ($rowTable->hasColumn('booking_date')) {
            $this->addSql('ALTER TABLE csv_import_row DROP booking_date');
        }
        if ($rowTable->hasColumn('csv_format')) {
            $this->addSql('ALTER TABLE csv_import_row DROP csv_format');
        }

        if ($schema->getTable('csv_import')->hasColumn('csv_format')) {
            $this->addSql('ALTER TABLE csv_import DROP csv_format');
        }
    }
}
