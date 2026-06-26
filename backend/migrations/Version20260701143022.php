<?php



declare(strict_types=1);



namespace App\Migrations;



use Doctrine\DBAL\Schema\Schema;

use Doctrine\Migrations\AbstractMigration;



/**

 * Transaction bank fields: operation_title, operation_desc, balance_after_minor; column reorder.

 */

final class Version20260701143022 extends AbstractMigration

{

    public function getDescription(): string

    {

        return 'Rename transaction title/description to operation_title/operation_desc, add balance_after_minor, reorder columns; reset classification_rule.';

    }



    public function up(Schema $schema): void

    {

        $this->addSql('DELETE FROM classification_rule');



        if (!$schema->hasTable('transactions')) {

            return;

        }



        $sm = $this->connection->createSchemaManager();

        $table = $sm->introspectTable('transactions');



        if ($table->hasColumn('title') && !$table->hasColumn('operation_title')) {

            $this->addSql('ALTER TABLE transactions CHANGE title operation_title LONGTEXT DEFAULT NULL');

        }



        if ($table->hasColumn('description') && !$table->hasColumn('operation_desc')) {

            $this->addSql('ALTER TABLE transactions CHANGE description operation_desc LONGTEXT DEFAULT NULL');

        }



        $table = $sm->introspectTable('transactions');



        if (!$table->hasColumn('balance_after_minor')) {

            $this->addSql('ALTER TABLE transactions ADD balance_after_minor INT DEFAULT NULL');

        }



        $table = $sm->introspectTable('transactions');



        if ($table->hasColumn('booking_date')) {

            $this->addSql('ALTER TABLE transactions MODIFY booking_date DATE DEFAULT NULL AFTER operation_date');

        }



        if ($table->hasColumn('operation_title')) {

            $this->addSql('ALTER TABLE transactions MODIFY operation_title LONGTEXT DEFAULT NULL AFTER booking_date');

        }



        if ($table->hasColumn('operation_desc')) {

            $this->addSql('ALTER TABLE transactions MODIFY operation_desc LONGTEXT DEFAULT NULL AFTER operation_title');

        }



        if ($table->hasColumn('operation_type')) {

            $this->addSql('ALTER TABLE transactions MODIFY operation_type VARCHAR(255) DEFAULT NULL AFTER operation_desc');

        }



        if ($table->hasColumn('balance_after_minor')) {

            $this->addSql('ALTER TABLE transactions MODIFY balance_after_minor INT DEFAULT NULL AFTER operation_type');

        }

    }



    public function down(Schema $schema): void

    {

        if (!$schema->hasTable('transactions')) {

            return;

        }



        $sm = $this->connection->createSchemaManager();

        $table = $sm->introspectTable('transactions');



        if ($table->hasColumn('operation_title') && !$table->hasColumn('title')) {

            $this->addSql('ALTER TABLE transactions CHANGE operation_title title LONGTEXT DEFAULT NULL');

        }



        if ($table->hasColumn('operation_desc') && !$table->hasColumn('description')) {

            $this->addSql('ALTER TABLE transactions CHANGE operation_desc description LONGTEXT DEFAULT NULL');

        }



        if ($table->hasColumn('balance_after_minor')) {

            $this->addSql('ALTER TABLE transactions DROP balance_after_minor');

        }

    }

}


