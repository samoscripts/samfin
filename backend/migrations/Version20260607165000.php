<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260607165000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Seed default admin user admin@samfin.local with password admin.';
    }

    public function up(Schema $schema): void
    {
        $now = (new \DateTimeImmutable())->format('Y-m-d H:i:s');
        $hash = password_hash('admin', PASSWORD_BCRYPT);

        $this->addSql(
            'INSERT INTO app_user (email, password_hash, forename, surname, display_name, role, avatar_sprite, avatar_index, active, api_token, created_at, updated_at)
             SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
             WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE email = ?)',
            [
                'admin@samfin.local',
                $hash,
                'Admin',
                'SamFin',
                'Administrator',
                'ADMIN',
                'funny-avatars-01',
                0,
                1,
                null,
                $now,
                $now,
                'admin@samfin.local',
            ]
        );
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DELETE FROM app_user WHERE email = ?', ['admin@samfin.local']);
    }
}

