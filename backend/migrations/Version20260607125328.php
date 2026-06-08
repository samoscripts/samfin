<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260607125328 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create app_user table';
    }

    public function up(Schema $schema): void
    {
        $this->abortIf(
            $this->connection->getDatabasePlatform()->getName() !== 'mysql',
            'Migration can only be executed safely on mysql.'
        );

        $this->addSql(<<<'SQL'
            CREATE TABLE app_user (
                id INT AUTO_INCREMENT NOT NULL,
                email VARCHAR(180) NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                forename VARCHAR(100) NOT NULL,
                surname VARCHAR(100) NOT NULL,
                display_name VARCHAR(100) NOT NULL,
                role VARCHAR(20) NOT NULL,
                avatar_sprite VARCHAR(100) DEFAULT NULL,
                avatar_index INT DEFAULT NULL,
                active TINYINT(1) NOT NULL,
                api_token VARCHAR(64) DEFAULT NULL,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                PRIMARY KEY (id)
            )
            DEFAULT CHARACTER SET utf8mb4
            COLLATE `utf8mb4_unicode_ci`
            ENGINE = InnoDB
        SQL);

        $this->addSql(
            'CREATE UNIQUE INDEX UNIQ_88BDF3E9E7927C74 ON app_user (email)'
        );

        $this->addSql(
            'CREATE UNIQUE INDEX UNIQ_88BDF3E97BA2F5EB ON app_user (api_token)'
        );
    }

    public function down(Schema $schema): void
    {
        $this->abortIf(
            $this->connection->getDatabasePlatform()->getName() !== 'mysql',
            'Migration can only be executed safely on mysql.'
        );

        $this->addSql('DROP TABLE app_user');
    }
}