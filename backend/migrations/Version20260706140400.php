<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Model B rotacji: Σ wpłat, anchor (rename next_depositor), wymuszony rebuild indeksu.
 */
final class Version20260706140400 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Settlement rotation Model B: deposit totals, rename next_depositor to anchor, truncate ledger.';
    }

    public function up(Schema $schema): void
    {
        if (!$schema->hasTable('settlement_ledger_entry')) {
            return;
        }

        $this->addSql('TRUNCATE TABLE settlement_ledger_entry');

        $this->addSql('ALTER TABLE settlement_ledger_entry
            ADD maciek_deposits_total_minor INT NOT NULL DEFAULT 0 AFTER wallet_balances_json,
            ADD basia_deposits_total_minor INT NOT NULL DEFAULT 0 AFTER maciek_deposits_total_minor,
            CHANGE next_depositor anchor VARCHAR(10) NOT NULL
        ');

        if ($schema->hasTable('settlement_config')) {
            $this->addSql('UPDATE settlement_config SET needs_refresh = 1');
        }
    }

    public function down(Schema $schema): void
    {
        if (!$schema->hasTable('settlement_ledger_entry')) {
            return;
        }

        $this->addSql('ALTER TABLE settlement_ledger_entry
            DROP maciek_deposits_total_minor,
            DROP basia_deposits_total_minor,
            CHANGE anchor next_depositor VARCHAR(10) NOT NULL
        ');
    }
}
