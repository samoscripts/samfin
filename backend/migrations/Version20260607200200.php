<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260607200200 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Strip DEFAULT values from csv_import INT columns and parse_status to match Doctrine mapping.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE csv_import_row CHANGE parse_status parse_status VARCHAR(20) NOT NULL');
        $this->addSql('ALTER TABLE csv_import CHANGE rows_total rows_total INT NOT NULL, CHANGE rows_parsed rows_parsed INT NOT NULL, CHANGE rows_invalid rows_invalid INT NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql("ALTER TABLE csv_import_row CHANGE parse_status parse_status VARCHAR(20) NOT NULL DEFAULT 'OK'");
        $this->addSql('ALTER TABLE csv_import CHANGE rows_total rows_total INT NOT NULL DEFAULT 0, CHANGE rows_parsed rows_parsed INT NOT NULL DEFAULT 0, CHANGE rows_invalid rows_invalid INT NOT NULL DEFAULT 0');
    }
}
