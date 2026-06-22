<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260622120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create transaction_template table and seed default classification templates for user_id=2.';
    }

    public function up(Schema $schema): void
    {
        $tableExists = (bool) $this->connection->fetchOne(
            "SELECT COUNT(*) FROM information_schema.tables
             WHERE table_schema = DATABASE() AND table_name = 'transaction_template'",
        );

        if (!$tableExists) {
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
                    UNIQUE INDEX uniq_transaction_template_user_name (user_id, name),
                    INDEX idx_transaction_template_user (user_id),
                    INDEX idx_transaction_template_wallet (wallet_id),
                    INDEX idx_transaction_template_concern (concern_id),
                    INDEX idx_transaction_template_category (category_id),
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

        $rows = [
            [1, 'Domyślny', 'EXPENSE', 1, 14, 1, 1, null, '2026-06-22 22:30:50', '2026-06-22 22:30:50'],
            [2, 'Salon', 'EXPENSE', 1, 14, 2, 3, 101, '2026-06-22 22:32:27', '2026-06-22 22:32:27'],
            [3, 'Maciej', 'EXPENSE', 1, 14, 1, 2, null, '2026-06-22 22:32:52', '2026-06-22 22:32:52'],
            [4, 'Basia', 'EXPENSE', 1, 14, 1, 3, null, '2026-06-22 22:33:02', '2026-06-22 22:33:02'],
            [5, 'Gotówka', 'EXPENSE', 4, 14, 1, 1, null, '2026-06-22 22:34:19', '2026-06-22 22:34:19'],
        ];

        foreach ($rows as [$id, $name, $direction, $paidFrom, $paidTo, $wallet, $concern, $category, $createdAt, $updatedAt]) {
            $categorySql = $category === null ? 'NULL' : (string) $category;

            $this->addSql(
                "INSERT INTO transaction_template (
                    id, user_id, name, direction,
                    paid_from_party_id, paid_to_party_id,
                    wallet_id, concern_id, category_id,
                    created_at, updated_at
                )
                SELECT
                    {$id}, 2, ?, ?, ?, ?, ?, ?, {$categorySql}, ?, ?
                FROM app_user
                WHERE id = 2
                  AND NOT EXISTS (SELECT 1 FROM transaction_template WHERE id = {$id})",
                [$name, $direction, $paidFrom, $paidTo, $wallet, $concern, $createdAt, $updatedAt],
            );
        }

        $this->addSql('ALTER TABLE transaction_template AUTO_INCREMENT = 6');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE transaction_template');
    }
}
