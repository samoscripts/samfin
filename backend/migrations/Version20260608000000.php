<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260608000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Migrate csv_import_row.parse_status from OK/ERROR to VALIDATED/PARSE_ERROR lifecycle model.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("UPDATE csv_import_row SET parse_status = 'VALIDATED'  WHERE parse_status = 'OK'");
        $this->addSql("UPDATE csv_import_row SET parse_status = 'PARSE_ERROR' WHERE parse_status = 'ERROR'");
    }

    public function down(Schema $schema): void
    {
        $this->addSql("UPDATE csv_import_row SET parse_status = 'OK'    WHERE parse_status = 'VALIDATED'");
        $this->addSql("UPDATE csv_import_row SET parse_status = 'ERROR'  WHERE parse_status = 'PARSE_ERROR'");
    }
}
