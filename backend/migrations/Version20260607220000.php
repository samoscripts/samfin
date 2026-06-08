<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260607220000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create transactions and transaction_items tables.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('
            CREATE TABLE transactions (
                id                  INT AUTO_INCREMENT NOT NULL,
                import_id           INT DEFAULT NULL,
                import_row_id       INT DEFAULT NULL,
                operation_date      DATE NOT NULL,
                description         LONGTEXT DEFAULT NULL,
                amount_minor        INT NOT NULL,
                direction           VARCHAR(10) NOT NULL,
                status              VARCHAR(25) NOT NULL,
                paid_from_party_id  INT DEFAULT NULL,
                paid_to_party_id    INT DEFAULT NULL,
                source              VARCHAR(30) NOT NULL,
                created_by          INT NOT NULL,
                updated_by          INT DEFAULT NULL,
                created_at          DATETIME NOT NULL,
                updated_at          DATETIME NOT NULL,
                PRIMARY KEY (id),
                UNIQUE INDEX uniq_transaction_import_row (import_row_id),
                INDEX idx_transaction_operation_date (operation_date),
                INDEX idx_transaction_status (status),
                INDEX idx_transaction_direction (direction),
                INDEX idx_transaction_paid_from_party (paid_from_party_id),
                INDEX idx_transaction_paid_to_party (paid_to_party_id),
                INDEX idx_transaction_import (import_id),
                CONSTRAINT fk_transaction_import
                    FOREIGN KEY (import_id) REFERENCES csv_import (id) ON DELETE SET NULL,
                CONSTRAINT fk_transaction_import_row
                    FOREIGN KEY (import_row_id) REFERENCES csv_import_row (id) ON DELETE SET NULL,
                CONSTRAINT fk_transaction_paid_from_party
                    FOREIGN KEY (paid_from_party_id) REFERENCES party (id) ON DELETE SET NULL,
                CONSTRAINT fk_transaction_paid_to_party
                    FOREIGN KEY (paid_to_party_id) REFERENCES party (id) ON DELETE SET NULL,
                CONSTRAINT fk_transaction_created_by
                    FOREIGN KEY (created_by) REFERENCES app_user (id),
                CONSTRAINT fk_transaction_updated_by
                    FOREIGN KEY (updated_by) REFERENCES app_user (id) ON DELETE SET NULL
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        ');

        $this->addSql('
            CREATE TABLE transaction_items (
                id             INT AUTO_INCREMENT NOT NULL,
                transaction_id INT NOT NULL,
                amount_minor   INT NOT NULL,
                description    VARCHAR(255) DEFAULT NULL,
                wallet_id      INT DEFAULT NULL,
                concern_id     INT DEFAULT NULL,
                category_id    INT DEFAULT NULL,
                created_by     INT NOT NULL,
                updated_by     INT DEFAULT NULL,
                created_at     DATETIME NOT NULL,
                updated_at     DATETIME NOT NULL,
                PRIMARY KEY (id),
                INDEX idx_transaction_item_transaction (transaction_id),
                INDEX idx_transaction_item_wallet (wallet_id),
                INDEX idx_transaction_item_concern (concern_id),
                INDEX idx_transaction_item_category (category_id),
                CONSTRAINT fk_transaction_item_transaction
                    FOREIGN KEY (transaction_id) REFERENCES transactions (id) ON DELETE CASCADE,
                CONSTRAINT fk_transaction_item_wallet
                    FOREIGN KEY (wallet_id) REFERENCES wallet (id) ON DELETE SET NULL,
                CONSTRAINT fk_transaction_item_concern
                    FOREIGN KEY (concern_id) REFERENCES concern (id) ON DELETE SET NULL,
                CONSTRAINT fk_transaction_item_category
                    FOREIGN KEY (category_id) REFERENCES category (id) ON DELETE SET NULL,
                CONSTRAINT fk_transaction_item_created_by
                    FOREIGN KEY (created_by) REFERENCES app_user (id),
                CONSTRAINT fk_transaction_item_updated_by
                    FOREIGN KEY (updated_by) REFERENCES app_user (id) ON DELETE SET NULL
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        ');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE transaction_items');
        $this->addSql('DROP TABLE transactions');
    }
}
