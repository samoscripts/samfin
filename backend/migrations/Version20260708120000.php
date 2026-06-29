<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260708120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'category: drop direction_expense, direction_income (ADR-036, categories direction-agnostic).';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE category DROP CONSTRAINT chk_category_direction');
        $this->addSql('ALTER TABLE category DROP direction_expense');
        $this->addSql('ALTER TABLE category DROP direction_income');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE category ADD direction_expense TINYINT(1) NOT NULL DEFAULT 1');
        $this->addSql('ALTER TABLE category ADD direction_income TINYINT(1) NOT NULL DEFAULT 0');
        $this->addSql(
            'ALTER TABLE category ADD CONSTRAINT chk_category_direction CHECK (direction_expense = 1 OR direction_income = 1)',
        );
    }
}
