<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Drop trans_localization and title_localization_raw; reorder transactions columns after drop.
 */
final class Version20260704143000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Drop trans_localization and title_localization_raw; reorder transactions columns after drop.';
    }

    public function up(Schema $schema): void
    {
        if ($schema->hasTable('csv_import_row')) {
            $sm = $this->connection->createSchemaManager();
            $rowTable = $sm->introspectTable('csv_import_row');
            if ($rowTable->hasColumn('title_localization_raw')) {
                $this->addSql('ALTER TABLE csv_import_row DROP title_localization_raw');
            }
        }

        if (!$schema->hasTable('transactions')) {
            return;
        }

        $sm = $this->connection->createSchemaManager();
        $table = $sm->introspectTable('transactions');

        if ($table->hasColumn('trans_localization')) {
            $this->addSql('ALTER TABLE transactions DROP trans_localization');
        }

        $table = $sm->introspectTable('transactions');

        if ($table->hasColumn('amount_minor')) {
            $this->addSql('ALTER TABLE transactions MODIFY amount_minor INT NOT NULL AFTER trans_description');
        }
        if ($table->hasColumn('balance_after_minor')) {
            $this->addSql('ALTER TABLE transactions MODIFY balance_after_minor INT DEFAULT NULL AFTER amount_minor');
        }
    }

    public function down(Schema $schema): void
    {
        if ($schema->hasTable('transactions')) {
            $sm = $this->connection->createSchemaManager();
            $table = $sm->introspectTable('transactions');
            if (!$table->hasColumn('trans_localization')) {
                $this->addSql('ALTER TABLE transactions ADD trans_localization LONGTEXT DEFAULT NULL AFTER trans_description');
            }
            if ($table->hasColumn('amount_minor')) {
                $this->addSql('ALTER TABLE transactions MODIFY amount_minor INT NOT NULL AFTER trans_localization');
            }
        }

        if ($schema->hasTable('csv_import_row')) {
            $sm = $this->connection->createSchemaManager();
            $rowTable = $sm->introspectTable('csv_import_row');
            if (!$rowTable->hasColumn('title_localization_raw')) {
                $this->addSql('ALTER TABLE csv_import_row ADD title_localization_raw LONGTEXT DEFAULT NULL');
            }
            if ($rowTable->hasColumn('title_clean')) {
                $this->addSql('ALTER TABLE csv_import_row MODIFY title_localization_raw LONGTEXT DEFAULT NULL AFTER title_clean');
            }
        }
    }
}
