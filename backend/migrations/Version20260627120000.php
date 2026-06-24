<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260627120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Rename common_account_settlement_config to settlement_config and settlement_party_id column.';
    }

    public function up(Schema $schema): void
    {
        if (!$schema->hasTable('common_account_settlement_config')) {
            return;
        }

        $this->addSql('RENAME TABLE common_account_settlement_config TO settlement_config');
        $this->addSql('ALTER TABLE settlement_config RENAME COLUMN common_account_party_id TO settlement_party_id');
    }

    public function down(Schema $schema): void
    {
        if (!$schema->hasTable('settlement_config')) {
            return;
        }

        $this->addSql('ALTER TABLE settlement_config RENAME COLUMN settlement_party_id TO common_account_party_id');
        $this->addSql('RENAME TABLE settlement_config TO common_account_settlement_config');
    }
}
