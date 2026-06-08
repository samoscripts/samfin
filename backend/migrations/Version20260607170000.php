<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260607170000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create wallet, concern and category tables.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(
            'CREATE TABLE wallet (
                id          INT AUTO_INCREMENT NOT NULL,
                name        VARCHAR(200) NOT NULL,
                description LONGTEXT DEFAULT NULL,
                active      TINYINT(1) NOT NULL,
                created_at  DATETIME NOT NULL,
                updated_at  DATETIME NOT NULL,
                PRIMARY KEY(id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB'
        );

        $this->addSql(
            'CREATE TABLE concern (
                id          INT AUTO_INCREMENT NOT NULL,
                name        VARCHAR(200) NOT NULL,
                description LONGTEXT DEFAULT NULL,
                active      TINYINT(1) NOT NULL,
                created_at  DATETIME NOT NULL,
                updated_at  DATETIME NOT NULL,
                PRIMARY KEY(id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB'
        );

        $this->addSql(
            'CREATE TABLE category (
                id          INT AUTO_INCREMENT NOT NULL,
                name        VARCHAR(200) NOT NULL,
                type        VARCHAR(20) NOT NULL,
                description LONGTEXT DEFAULT NULL,
                active      TINYINT(1) NOT NULL,
                created_at  DATETIME NOT NULL,
                updated_at  DATETIME NOT NULL,
                PRIMARY KEY(id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB'
        );
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE category');
        $this->addSql('DROP TABLE concern');
        $this->addSql('DROP TABLE wallet');
    }
}
