<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260707120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Tabela user_category_pick_event — log wyborów kategorii per użytkownik (najczęściej wybierane).';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('
            CREATE TABLE user_category_pick_event (
                id          BIGINT AUTO_INCREMENT NOT NULL,
                user_id     INT NOT NULL,
                category_id INT NOT NULL,
                direction   VARCHAR(10) NOT NULL,
                created_at  DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
                INDEX idx_ucpe_user_direction_created (user_id, direction, created_at),
                INDEX idx_ucpe_user_category_direction (user_id, category_id, direction),
                INDEX IDX_UCPE_USER (user_id),
                INDEX IDX_UCPE_CATEGORY (category_id),
                PRIMARY KEY(id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        ');
        $this->addSql('
            ALTER TABLE user_category_pick_event
                ADD CONSTRAINT FK_UCPE_USER FOREIGN KEY (user_id) REFERENCES app_user (id) ON DELETE CASCADE
        ');
        $this->addSql('
            ALTER TABLE user_category_pick_event
                ADD CONSTRAINT FK_UCPE_CATEGORY FOREIGN KEY (category_id) REFERENCES category (id) ON DELETE CASCADE
        ');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE user_category_pick_event');
    }
}
