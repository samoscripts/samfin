<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Add optional user-editable trans_custom_description to transactions and transaction_template.
 */
final class Version20260709120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add trans_custom_description to transactions and transaction_template.';
    }

    public function up(Schema $schema): void
    {
        if ($schema->hasTable('transactions')) {
            $sm = $this->connection->createSchemaManager();
            $table = $sm->introspectTable('transactions');
            if (!$table->hasColumn('trans_custom_description')) {
                $this->addSql(
                    'ALTER TABLE transactions ADD trans_custom_description LONGTEXT DEFAULT NULL AFTER trans_description',
                );
            }
        }

        if ($schema->hasTable('transaction_template')) {
            $sm = $this->connection->createSchemaManager();
            $table = $sm->introspectTable('transaction_template');
            if (!$table->hasColumn('trans_custom_description')) {
                $this->addSql(
                    'ALTER TABLE transaction_template ADD trans_custom_description LONGTEXT DEFAULT NULL AFTER category_id',
                );
            }
        }
    }

    public function down(Schema $schema): void
    {
        if ($schema->hasTable('transactions')) {
            $sm = $this->connection->createSchemaManager();
            $table = $sm->introspectTable('transactions');
            if ($table->hasColumn('trans_custom_description')) {
                $this->addSql('ALTER TABLE transactions DROP trans_custom_description');
            }
        }

        if ($schema->hasTable('transaction_template')) {
            $sm = $this->connection->createSchemaManager();
            $table = $sm->introspectTable('transaction_template');
            if ($table->hasColumn('trans_custom_description')) {
                $this->addSql('ALTER TABLE transaction_template DROP trans_custom_description');
            }
        }
    }
}
