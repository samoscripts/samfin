<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260622120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add transaction_template table for per-user classification templates.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('
            CREATE TABLE transaction_template (
                id                  INT AUTO_INCREMENT NOT NULL,
                user_id             INT NOT NULL,
                name                VARCHAR(200) NOT NULL,
                direction           VARCHAR(10) NOT NULL,
                paid_from_party_id  INT DEFAULT NULL,
                paid_to_party_id    INT DEFAULT NULL,
                wallet_id           INT DEFAULT NULL,
                concern_id          INT DEFAULT NULL,
                category_id         INT DEFAULT NULL,
                created_at          DATETIME NOT NULL,
                updated_at          DATETIME NOT NULL,
                PRIMARY KEY (id),
                UNIQUE INDEX uniq_transaction_template_user_direction_name (user_id, direction, name),
                INDEX idx_transaction_template_user_direction (user_id, direction),
                CONSTRAINT fk_transaction_template_user
                    FOREIGN KEY (user_id) REFERENCES app_user (id) ON DELETE CASCADE,
                CONSTRAINT fk_transaction_template_paid_from_party
                    FOREIGN KEY (paid_from_party_id) REFERENCES party (id) ON DELETE SET NULL,
                CONSTRAINT fk_transaction_template_paid_to_party
                    FOREIGN KEY (paid_to_party_id) REFERENCES party (id) ON DELETE SET NULL,
                CONSTRAINT fk_transaction_template_wallet
                    FOREIGN KEY (wallet_id) REFERENCES wallet (id) ON DELETE SET NULL,
                CONSTRAINT fk_transaction_template_concern
                    FOREIGN KEY (concern_id) REFERENCES concern (id) ON DELETE SET NULL,
                CONSTRAINT fk_transaction_template_category
                    FOREIGN KEY (category_id) REFERENCES category (id) ON DELETE SET NULL
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        ');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE transaction_template');
    }
}
