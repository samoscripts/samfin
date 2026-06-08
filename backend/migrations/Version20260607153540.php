<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260607153540 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create party and party_bank_account tables';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE party (
                id INT AUTO_INCREMENT NOT NULL,
                name VARCHAR(200) NOT NULL,
                type VARCHAR(20) NOT NULL,
                ownership_type VARCHAR(20) NOT NULL,
                usage_type VARCHAR(20) NOT NULL,
                description LONGTEXT DEFAULT NULL,
                active TINYINT(1) NOT NULL,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                PRIMARY KEY (id)
            )
            DEFAULT CHARACTER SET utf8mb4
            COLLATE `utf8mb4_unicode_ci`
            ENGINE = InnoDB
        SQL);

        $this->addSql(<<<'SQL'
            CREATE TABLE party_bank_account (
                id INT AUTO_INCREMENT NOT NULL,
                party_id INT NOT NULL,
                bank_name VARCHAR(200) DEFAULT NULL,
                account_number VARCHAR(50) NOT NULL,
                display_name VARCHAR(200) DEFAULT NULL,
                owner_name_from_bank VARCHAR(200) DEFAULT NULL,
                currency VARCHAR(10) NOT NULL DEFAULT 'PLN',
                active TINYINT(1) NOT NULL,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                INDEX IDX_CC62B8D9213C1059 (party_id),
                PRIMARY KEY (id)
            )
            DEFAULT CHARACTER SET utf8mb4
            COLLATE `utf8mb4_unicode_ci`
            ENGINE = InnoDB
        SQL);

        $this->addSql(<<<'SQL'
            ALTER TABLE party_bank_account
            ADD CONSTRAINT FK_CC62B8D9213C1059
            FOREIGN KEY (party_id)
            REFERENCES party (id)
            ON DELETE RESTRICT
        SQL);
    }

    public function down(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            ALTER TABLE party_bank_account
            DROP FOREIGN KEY FK_CC62B8D9213C1059
        SQL);

        $this->addSql('DROP TABLE party_bank_account');
        $this->addSql('DROP TABLE party');
    }
}