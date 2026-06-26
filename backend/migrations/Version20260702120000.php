<?php



declare(strict_types=1);



namespace App\Migrations;



use Doctrine\DBAL\Schema\Schema;

use Doctrine\Migrations\AbstractMigration;



/**

 * transactions: trans_* fields, trans_localization, drop operation_type; csv_import_row.title_localization_raw.

 */

final class Version20260702120000 extends AbstractMigration

{

    public function getDescription(): string

    {

        return 'Rename operation_* to trans_* on transactions, add trans_localization, drop operation_type, full column reorder; csv_import_row.title_localization_raw; reset classification_rule.';

    }



    public function up(Schema $schema): void

    {

        $this->addSql('DELETE FROM classification_rule');



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



        if (!$schema->hasTable('transactions')) {

            return;

        }



        $sm = $this->connection->createSchemaManager();

        $table = $sm->introspectTable('transactions');



        if ($table->hasColumn('operation_date') && !$table->hasColumn('trans_date')) {

            $this->addSql('ALTER TABLE transactions CHANGE operation_date trans_date DATE NOT NULL');

        }



        if ($table->hasColumn('operation_title') && !$table->hasColumn('trans_title')) {

            $this->addSql('ALTER TABLE transactions CHANGE operation_title trans_title LONGTEXT DEFAULT NULL');

        }



        if ($table->hasColumn('operation_desc') && !$table->hasColumn('trans_description')) {

            $this->addSql('ALTER TABLE transactions CHANGE operation_desc trans_description LONGTEXT DEFAULT NULL');

        }



        $table = $sm->introspectTable('transactions');



        if ($table->hasColumn('operation_type')) {

            $this->addSql('ALTER TABLE transactions DROP operation_type');

        }



        if (!$table->hasColumn('trans_localization')) {

            $this->addSql('ALTER TABLE transactions ADD trans_localization LONGTEXT DEFAULT NULL');

        }



        $table = $sm->introspectTable('transactions');

        if ($table->hasColumn('import_id')) {
            $this->addSql('ALTER TABLE transactions MODIFY import_id INT DEFAULT NULL AFTER id');
        }
        if ($table->hasColumn('import_row_id')) {
            $this->addSql('ALTER TABLE transactions MODIFY import_row_id INT DEFAULT NULL AFTER import_id');
        }
        if ($table->hasColumn('trans_date')) {
            $this->addSql('ALTER TABLE transactions MODIFY trans_date DATE NOT NULL AFTER import_row_id');
        }
        if ($table->hasColumn('booking_date')) {
            $this->addSql('ALTER TABLE transactions MODIFY booking_date DATE DEFAULT NULL AFTER trans_date');
        }
        if ($table->hasColumn('trans_title')) {
            $this->addSql('ALTER TABLE transactions MODIFY trans_title LONGTEXT DEFAULT NULL AFTER booking_date');
        }
        if ($table->hasColumn('trans_description')) {
            $this->addSql('ALTER TABLE transactions MODIFY trans_description LONGTEXT DEFAULT NULL AFTER trans_title');
        }
        if ($table->hasColumn('trans_localization')) {
            $this->addSql('ALTER TABLE transactions MODIFY trans_localization LONGTEXT DEFAULT NULL AFTER trans_description');
        }
        if ($table->hasColumn('amount_minor')) {
            $this->addSql('ALTER TABLE transactions MODIFY amount_minor INT NOT NULL AFTER trans_localization');
        }
        if ($table->hasColumn('balance_after_minor')) {
            $this->addSql('ALTER TABLE transactions MODIFY balance_after_minor INT DEFAULT NULL AFTER amount_minor');
        }
        if ($table->hasColumn('direction')) {
            $this->addSql('ALTER TABLE transactions MODIFY direction VARCHAR(10) NOT NULL AFTER balance_after_minor');
        }
        if ($table->hasColumn('status')) {
            $this->addSql('ALTER TABLE transactions MODIFY status VARCHAR(25) NOT NULL AFTER direction');
        }
        if ($table->hasColumn('paid_from_party_id')) {
            $this->addSql('ALTER TABLE transactions MODIFY paid_from_party_id INT DEFAULT NULL AFTER status');
        }
        if ($table->hasColumn('paid_to_party_id')) {
            $this->addSql('ALTER TABLE transactions MODIFY paid_to_party_id INT DEFAULT NULL AFTER paid_from_party_id');
        }
        if ($table->hasColumn('source')) {
            $this->addSql('ALTER TABLE transactions MODIFY source VARCHAR(30) NOT NULL AFTER paid_to_party_id');
        }
        if ($table->hasColumn('counterparty_account_number')) {
            $this->addSql('ALTER TABLE transactions MODIFY counterparty_account_number VARCHAR(26) DEFAULT NULL AFTER source');
        }
        if ($table->hasColumn('counterparty_name')) {
            $this->addSql('ALTER TABLE transactions MODIFY counterparty_name VARCHAR(512) DEFAULT NULL AFTER counterparty_account_number');
        }
        if ($table->hasColumn('created_by')) {
            $this->addSql('ALTER TABLE transactions MODIFY created_by INT NOT NULL AFTER counterparty_name');
        }
        if ($table->hasColumn('updated_by')) {
            $this->addSql('ALTER TABLE transactions MODIFY updated_by INT DEFAULT NULL AFTER created_by');
        }
        if ($table->hasColumn('created_at')) {
            $this->addSql('ALTER TABLE transactions MODIFY created_at DATETIME NOT NULL AFTER updated_by');
        }
        if ($table->hasColumn('updated_at')) {
            $this->addSql('ALTER TABLE transactions MODIFY updated_at DATETIME NOT NULL AFTER created_at');
        }

        if ($table->hasIndex('idx_transaction_operation_date')) {

            $this->addSql('ALTER TABLE transactions DROP INDEX idx_transaction_operation_date');

        }

        $table = $sm->introspectTable('transactions');

        if (!$table->hasIndex('idx_transaction_trans_date')) {

            $this->addSql('CREATE INDEX idx_transaction_trans_date ON transactions (trans_date)');

        }

    }



    public function down(Schema $schema): void

    {

        if (!$schema->hasTable('transactions')) {

            return;

        }



        $sm = $this->connection->createSchemaManager();

        $table = $sm->introspectTable('transactions');



        if ($table->hasIndex('idx_transaction_trans_date')) {

            $this->addSql('ALTER TABLE transactions DROP INDEX idx_transaction_trans_date');

        }



        if ($table->hasColumn('trans_localization')) {

            $this->addSql('ALTER TABLE transactions DROP trans_localization');

        }



        if ($table->hasColumn('trans_date') && !$table->hasColumn('operation_date')) {

            $this->addSql('ALTER TABLE transactions CHANGE trans_date operation_date DATE NOT NULL');

        }

        if ($table->hasColumn('trans_title') && !$table->hasColumn('operation_title')) {

            $this->addSql('ALTER TABLE transactions CHANGE trans_title operation_title LONGTEXT DEFAULT NULL');

        }

        if ($table->hasColumn('trans_description') && !$table->hasColumn('operation_desc')) {

            $this->addSql('ALTER TABLE transactions CHANGE trans_description operation_desc LONGTEXT DEFAULT NULL');

        }



        if (!$table->hasColumn('operation_type')) {

            $this->addSql('ALTER TABLE transactions ADD operation_type VARCHAR(255) DEFAULT NULL');

        }



        if ($schema->hasTable('csv_import_row')) {

            $rowTable = $sm->introspectTable('csv_import_row');

            if ($rowTable->hasColumn('title_localization_raw')) {

                $this->addSql('ALTER TABLE csv_import_row DROP title_localization_raw');

            }

        }

    }

}


