<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260613120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Replace party.usage_type with direction_usage_income and direction_usage_expense booleans.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE party ADD direction_usage_income TINYINT(1) NOT NULL DEFAULT 1');
        $this->addSql('ALTER TABLE party ADD direction_usage_expense TINYINT(1) NOT NULL DEFAULT 1');

        $this->addSql("
            UPDATE party SET
                direction_usage_income  = CASE usage_type
                    WHEN 'EXPENSE' THEN 0
                    ELSE 1
                END,
                direction_usage_expense = CASE usage_type
                    WHEN 'INCOME' THEN 0
                    ELSE 1
                END
        ");

        $this->addSql('ALTER TABLE party DROP usage_type');
    }

    public function down(Schema $schema): void
    {
        $this->addSql("ALTER TABLE party ADD usage_type VARCHAR(20) NOT NULL DEFAULT 'BOTH'");

        $this->addSql("
            UPDATE party SET usage_type = CASE
                WHEN direction_usage_income = 1 AND direction_usage_expense = 1 THEN 'BOTH'
                WHEN direction_usage_income = 1 THEN 'INCOME'
                WHEN direction_usage_expense = 1 THEN 'EXPENSE'
                ELSE 'BOTH'
            END
        ");

        $this->addSql('ALTER TABLE party DROP direction_usage_income');
        $this->addSql('ALTER TABLE party DROP direction_usage_expense');
    }
}
