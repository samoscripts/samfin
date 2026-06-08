<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260607200100 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Rename csv_import* indexes to Doctrine naming convention.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE csv_import_error RENAME INDEX idx_csv_import_error_import TO IDX_1C190D92E1BA9114');
        $this->addSql('ALTER TABLE csv_import_row RENAME INDEX idx_csv_import_row_import TO IDX_F5DFF0A4E1BA9114');
        $this->addSql('ALTER TABLE csv_import RENAME INDEX idx_csv_import_pba   TO IDX_835A46E26BB9EF87');
        $this->addSql('ALTER TABLE csv_import RENAME INDEX idx_csv_import_party TO IDX_835A46E2213C1059');
        $this->addSql('ALTER TABLE csv_import RENAME INDEX idx_csv_import_cb    TO IDX_835A46E2DE12AB56');
        $this->addSql('ALTER TABLE csv_import RENAME INDEX idx_csv_import_ub    TO IDX_835A46E216FE72E1');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE csv_import RENAME INDEX IDX_835A46E216FE72E1 TO idx_csv_import_ub');
        $this->addSql('ALTER TABLE csv_import RENAME INDEX IDX_835A46E2DE12AB56 TO idx_csv_import_cb');
        $this->addSql('ALTER TABLE csv_import RENAME INDEX IDX_835A46E2213C1059 TO idx_csv_import_party');
        $this->addSql('ALTER TABLE csv_import RENAME INDEX IDX_835A46E26BB9EF87 TO idx_csv_import_pba');
        $this->addSql('ALTER TABLE csv_import_row RENAME INDEX IDX_F5DFF0A4E1BA9114 TO idx_csv_import_row_import');
        $this->addSql('ALTER TABLE csv_import_error RENAME INDEX IDX_1C190D92E1BA9114 TO idx_csv_import_error_import');
    }
}
