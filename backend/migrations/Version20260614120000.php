<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260614120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Rename csv_import_row.account_raw to own_account_label_raw; add counterparty_account_raw.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('
            ALTER TABLE csv_import_row
                CHANGE account_raw own_account_label_raw VARCHAR(255) DEFAULT NULL,
                ADD counterparty_account_raw VARCHAR(26) DEFAULT NULL
        ');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('
            ALTER TABLE csv_import_row
                DROP counterparty_account_raw,
                CHANGE own_account_label_raw account_raw VARCHAR(255) DEFAULT NULL
        ');
    }
}
