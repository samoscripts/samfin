<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260607204500 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Rename foreign key constraints to readable fk_{table}_{column} names for core configuration tables.';
    }

    public function up(Schema $schema): void
    {
        // party
        $this->addSql('ALTER TABLE party DROP FOREIGN KEY FK_party_created_by');
        $this->addSql('ALTER TABLE party ADD CONSTRAINT fk_party_created_by FOREIGN KEY (created_by) REFERENCES app_user (id)');
        $this->addSql('ALTER TABLE party DROP FOREIGN KEY FK_party_updated_by');
        $this->addSql('ALTER TABLE party ADD CONSTRAINT fk_party_updated_by FOREIGN KEY (updated_by) REFERENCES app_user (id) ON DELETE SET NULL');

        // party_bank_account
        $this->addSql('ALTER TABLE party_bank_account DROP FOREIGN KEY FK_CC62B8D9213C1059');
        $this->addSql('ALTER TABLE party_bank_account ADD CONSTRAINT fk_party_bank_account_party FOREIGN KEY (party_id) REFERENCES party (id) ON DELETE RESTRICT');
        $this->addSql('ALTER TABLE party_bank_account DROP FOREIGN KEY FK_pba_created_by');
        $this->addSql('ALTER TABLE party_bank_account ADD CONSTRAINT fk_party_bank_account_created_by FOREIGN KEY (created_by) REFERENCES app_user (id)');
        $this->addSql('ALTER TABLE party_bank_account DROP FOREIGN KEY FK_pba_updated_by');
        $this->addSql('ALTER TABLE party_bank_account ADD CONSTRAINT fk_party_bank_account_updated_by FOREIGN KEY (updated_by) REFERENCES app_user (id) ON DELETE SET NULL');

        // wallet
        $this->addSql('ALTER TABLE wallet DROP FOREIGN KEY FK_wallet_created_by');
        $this->addSql('ALTER TABLE wallet ADD CONSTRAINT fk_wallet_created_by FOREIGN KEY (created_by) REFERENCES app_user (id)');
        $this->addSql('ALTER TABLE wallet DROP FOREIGN KEY FK_wallet_updated_by');
        $this->addSql('ALTER TABLE wallet ADD CONSTRAINT fk_wallet_updated_by FOREIGN KEY (updated_by) REFERENCES app_user (id) ON DELETE SET NULL');

        // concern
        $this->addSql('ALTER TABLE concern DROP FOREIGN KEY FK_concern_created_by');
        $this->addSql('ALTER TABLE concern ADD CONSTRAINT fk_concern_created_by FOREIGN KEY (created_by) REFERENCES app_user (id)');
        $this->addSql('ALTER TABLE concern DROP FOREIGN KEY FK_concern_updated_by');
        $this->addSql('ALTER TABLE concern ADD CONSTRAINT fk_concern_updated_by FOREIGN KEY (updated_by) REFERENCES app_user (id) ON DELETE SET NULL');

        // category
        $this->addSql('ALTER TABLE category DROP FOREIGN KEY FK_64C19C1727ACA70');
        $this->addSql('ALTER TABLE category ADD CONSTRAINT fk_category_parent FOREIGN KEY (parent_id) REFERENCES category (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE category DROP FOREIGN KEY FK_category_created_by');
        $this->addSql('ALTER TABLE category ADD CONSTRAINT fk_category_created_by FOREIGN KEY (created_by) REFERENCES app_user (id)');
        $this->addSql('ALTER TABLE category DROP FOREIGN KEY FK_category_updated_by');
        $this->addSql('ALTER TABLE category ADD CONSTRAINT fk_category_updated_by FOREIGN KEY (updated_by) REFERENCES app_user (id) ON DELETE SET NULL');
    }

    public function down(Schema $schema): void
    {
        // category
        $this->addSql('ALTER TABLE category DROP FOREIGN KEY fk_category_parent');
        $this->addSql('ALTER TABLE category ADD CONSTRAINT FK_64C19C1727ACA70 FOREIGN KEY (parent_id) REFERENCES category (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE category DROP FOREIGN KEY fk_category_created_by');
        $this->addSql('ALTER TABLE category ADD CONSTRAINT FK_category_created_by FOREIGN KEY (created_by) REFERENCES app_user (id)');
        $this->addSql('ALTER TABLE category DROP FOREIGN KEY fk_category_updated_by');
        $this->addSql('ALTER TABLE category ADD CONSTRAINT FK_category_updated_by FOREIGN KEY (updated_by) REFERENCES app_user (id) ON DELETE SET NULL');

        // concern
        $this->addSql('ALTER TABLE concern DROP FOREIGN KEY fk_concern_created_by');
        $this->addSql('ALTER TABLE concern ADD CONSTRAINT FK_concern_created_by FOREIGN KEY (created_by) REFERENCES app_user (id)');
        $this->addSql('ALTER TABLE concern DROP FOREIGN KEY fk_concern_updated_by');
        $this->addSql('ALTER TABLE concern ADD CONSTRAINT FK_concern_updated_by FOREIGN KEY (updated_by) REFERENCES app_user (id) ON DELETE SET NULL');

        // wallet
        $this->addSql('ALTER TABLE wallet DROP FOREIGN KEY fk_wallet_created_by');
        $this->addSql('ALTER TABLE wallet ADD CONSTRAINT FK_wallet_created_by FOREIGN KEY (created_by) REFERENCES app_user (id)');
        $this->addSql('ALTER TABLE wallet DROP FOREIGN KEY fk_wallet_updated_by');
        $this->addSql('ALTER TABLE wallet ADD CONSTRAINT FK_wallet_updated_by FOREIGN KEY (updated_by) REFERENCES app_user (id) ON DELETE SET NULL');

        // party_bank_account
        $this->addSql('ALTER TABLE party_bank_account DROP FOREIGN KEY fk_party_bank_account_party');
        $this->addSql('ALTER TABLE party_bank_account ADD CONSTRAINT FK_CC62B8D9213C1059 FOREIGN KEY (party_id) REFERENCES party (id) ON DELETE RESTRICT');
        $this->addSql('ALTER TABLE party_bank_account DROP FOREIGN KEY fk_party_bank_account_created_by');
        $this->addSql('ALTER TABLE party_bank_account ADD CONSTRAINT FK_pba_created_by FOREIGN KEY (created_by) REFERENCES app_user (id)');
        $this->addSql('ALTER TABLE party_bank_account DROP FOREIGN KEY fk_party_bank_account_updated_by');
        $this->addSql('ALTER TABLE party_bank_account ADD CONSTRAINT FK_pba_updated_by FOREIGN KEY (updated_by) REFERENCES app_user (id) ON DELETE SET NULL');

        // party
        $this->addSql('ALTER TABLE party DROP FOREIGN KEY fk_party_created_by');
        $this->addSql('ALTER TABLE party ADD CONSTRAINT FK_party_created_by FOREIGN KEY (created_by) REFERENCES app_user (id)');
        $this->addSql('ALTER TABLE party DROP FOREIGN KEY fk_party_updated_by');
        $this->addSql('ALTER TABLE party ADD CONSTRAINT FK_party_updated_by FOREIGN KEY (updated_by) REFERENCES app_user (id) ON DELETE SET NULL');
    }
}

