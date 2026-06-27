<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Multi-token auth: user_api_token + migracja z app_user.api_token.
 * Idempotentna — bezpieczna gdy wcześniejsza próba (zła namespace) nie utworzyła tabeli.
 */
final class Version20260705120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Multi-token auth: user_api_token table, migrate app_user.api_token, drop column';
    }

    public function up(Schema $schema): void
    {
        if (!$schema->hasTable('user_api_token')) {
            $this->addSql(<<<'SQL'
                CREATE TABLE user_api_token (
                    id INT AUTO_INCREMENT NOT NULL,
                    user_id INT NOT NULL,
                    token VARCHAR(64) NOT NULL,
                    name VARCHAR(64) NOT NULL,
                    created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)',
                    last_used_at DATETIME DEFAULT NULL COMMENT '(DC2Type:datetime_immutable)',
                    INDEX IDX_USER_API_TOKEN_USER (user_id),
                    UNIQUE INDEX UNIQ_USER_API_TOKEN_TOKEN (token),
                    PRIMARY KEY(id)
                ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
                SQL);

            $this->addSql(<<<'SQL'
                ALTER TABLE user_api_token
                    ADD CONSTRAINT FK_USER_API_TOKEN_USER
                    FOREIGN KEY (user_id) REFERENCES app_user (id) ON DELETE CASCADE
                SQL);
        }

        $sm = $this->connection->createSchemaManager();
        $userTable = $sm->introspectTable('app_user');

        if ($userTable->hasColumn('api_token')) {
            $this->addSql(<<<'SQL'
                INSERT INTO user_api_token (user_id, token, name, created_at)
                SELECT u.id, u.api_token, 'migrated', NOW()
                FROM app_user u
                WHERE u.api_token IS NOT NULL
                  AND NOT EXISTS (
                      SELECT 1 FROM user_api_token t WHERE t.token = u.api_token
                  )
                SQL);

            $this->addSql('DROP INDEX UNIQ_88BDF3E97BA2F5EB ON app_user');
            $this->addSql('ALTER TABLE app_user DROP api_token');
        }
    }

    public function down(Schema $schema): void
    {
        if (!$schema->hasTable('user_api_token')) {
            return;
        }

        $sm = $this->connection->createSchemaManager();
        $userTable = $sm->introspectTable('app_user');

        if (!$userTable->hasColumn('api_token')) {
            $this->addSql('ALTER TABLE app_user ADD api_token VARCHAR(64) DEFAULT NULL');
            $this->addSql('CREATE UNIQUE INDEX UNIQ_88BDF3E97BA2F5EB ON app_user (api_token)');

            $this->addSql(<<<'SQL'
                UPDATE app_user u
                INNER JOIN (
                    SELECT t.user_id, t.token
                    FROM user_api_token t
                    INNER JOIN (
                        SELECT user_id, MAX(id) AS max_id
                        FROM user_api_token
                        GROUP BY user_id
                    ) latest ON t.id = latest.max_id
                ) src ON u.id = src.user_id
                SET u.api_token = src.token
                SQL);
        }

        $this->addSql('ALTER TABLE user_api_token DROP FOREIGN KEY FK_USER_API_TOKEN_USER');
        $this->addSql('DROP TABLE user_api_token');
    }
}
