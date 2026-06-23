<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260623120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'category: direction_expense, direction_income (replaces type).';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE category ADD direction_expense TINYINT(1) NOT NULL DEFAULT 1');
        $this->addSql('ALTER TABLE category ADD direction_income TINYINT(1) NOT NULL DEFAULT 0');
        $this->addSql("UPDATE category SET direction_expense = 1, direction_income = 0 WHERE type = 'EXPENSE'");
        $this->addSql("UPDATE category SET direction_expense = 0, direction_income = 1 WHERE type = 'INCOME'");
        $this->addSql('ALTER TABLE category DROP type');
        $this->addSql(
            'ALTER TABLE category ADD CONSTRAINT chk_category_direction CHECK (direction_expense = 1 OR direction_income = 1)',
        );
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE category DROP CONSTRAINT chk_category_direction');
        $this->addSql("ALTER TABLE category ADD type VARCHAR(20) NOT NULL DEFAULT 'EXPENSE'");
        $this->addSql("UPDATE category SET type = 'EXPENSE' WHERE direction_expense = 1 AND direction_income = 0");
        $this->addSql("UPDATE category SET type = 'INCOME' WHERE direction_income = 1 AND direction_expense = 0");
        $this->addSql('ALTER TABLE category DROP direction_expense');
        $this->addSql('ALTER TABLE category DROP direction_income');
    }
}
