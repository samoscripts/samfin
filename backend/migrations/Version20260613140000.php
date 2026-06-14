<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260613140000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Remove party.direction_usage_income and direction_usage_expense (replaced by contextual Skąd/Dokąd rules).';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE party DROP direction_usage_income');
        $this->addSql('ALTER TABLE party DROP direction_usage_expense');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE party ADD direction_usage_income TINYINT(1) NOT NULL DEFAULT 1');
        $this->addSql('ALTER TABLE party ADD direction_usage_expense TINYINT(1) NOT NULL DEFAULT 1');
    }
}
