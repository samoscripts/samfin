<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260607193000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add created_by / updated_by (FK to app_user) to wallet, concern, category, party, party_bank_account.';
    }

    public function up(Schema $schema): void
    {
        // wallet
        $this->addSql('ALTER TABLE wallet ADD created_by INT NOT NULL, ADD updated_by INT DEFAULT NULL');
        $this->addSql('ALTER TABLE wallet ADD INDEX IDX_7D89D987DE12AB56 (created_by)');
        $this->addSql('ALTER TABLE wallet ADD INDEX IDX_7D89D9872793CC5E (updated_by)');
        $this->addSql('ALTER TABLE wallet ADD CONSTRAINT FK_wallet_created_by FOREIGN KEY (created_by) REFERENCES app_user (id)');
        $this->addSql('ALTER TABLE wallet ADD CONSTRAINT FK_wallet_updated_by FOREIGN KEY (updated_by) REFERENCES app_user (id) ON DELETE SET NULL');

        // concern
        $this->addSql('ALTER TABLE concern ADD created_by INT NOT NULL, ADD updated_by INT DEFAULT NULL');
        $this->addSql('ALTER TABLE concern ADD INDEX IDX_concern_cb (created_by)');
        $this->addSql('ALTER TABLE concern ADD INDEX IDX_concern_ub (updated_by)');
        $this->addSql('ALTER TABLE concern ADD CONSTRAINT FK_concern_created_by FOREIGN KEY (created_by) REFERENCES app_user (id)');
        $this->addSql('ALTER TABLE concern ADD CONSTRAINT FK_concern_updated_by FOREIGN KEY (updated_by) REFERENCES app_user (id) ON DELETE SET NULL');

        // category
        $this->addSql('ALTER TABLE category ADD created_by INT NOT NULL, ADD updated_by INT DEFAULT NULL');
        $this->addSql('ALTER TABLE category ADD INDEX IDX_category_cb (created_by)');
        $this->addSql('ALTER TABLE category ADD INDEX IDX_category_ub (updated_by)');
        $this->addSql('ALTER TABLE category ADD CONSTRAINT FK_category_created_by FOREIGN KEY (created_by) REFERENCES app_user (id)');
        $this->addSql('ALTER TABLE category ADD CONSTRAINT FK_category_updated_by FOREIGN KEY (updated_by) REFERENCES app_user (id) ON DELETE SET NULL');

        // party
        $this->addSql('ALTER TABLE party ADD created_by INT NOT NULL, ADD updated_by INT DEFAULT NULL');
        $this->addSql('ALTER TABLE party ADD INDEX IDX_party_cb (created_by)');
        $this->addSql('ALTER TABLE party ADD INDEX IDX_party_ub (updated_by)');
        $this->addSql('ALTER TABLE party ADD CONSTRAINT FK_party_created_by FOREIGN KEY (created_by) REFERENCES app_user (id)');
        $this->addSql('ALTER TABLE party ADD CONSTRAINT FK_party_updated_by FOREIGN KEY (updated_by) REFERENCES app_user (id) ON DELETE SET NULL');

        // party_bank_account
        $this->addSql('ALTER TABLE party_bank_account ADD created_by INT NOT NULL, ADD updated_by INT DEFAULT NULL');
        $this->addSql('ALTER TABLE party_bank_account ADD INDEX IDX_pba_cb (created_by)');
        $this->addSql('ALTER TABLE party_bank_account ADD INDEX IDX_pba_ub (updated_by)');
        $this->addSql('ALTER TABLE party_bank_account ADD CONSTRAINT FK_pba_created_by FOREIGN KEY (created_by) REFERENCES app_user (id)');
        $this->addSql('ALTER TABLE party_bank_account ADD CONSTRAINT FK_pba_updated_by FOREIGN KEY (updated_by) REFERENCES app_user (id) ON DELETE SET NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE party_bank_account DROP FOREIGN KEY FK_pba_created_by');
        $this->addSql('ALTER TABLE party_bank_account DROP FOREIGN KEY FK_pba_updated_by');
        $this->addSql('DROP INDEX IDX_pba_cb ON party_bank_account');
        $this->addSql('DROP INDEX IDX_pba_ub ON party_bank_account');
        $this->addSql('ALTER TABLE party_bank_account DROP created_by, DROP updated_by');

        $this->addSql('ALTER TABLE party DROP FOREIGN KEY FK_party_created_by');
        $this->addSql('ALTER TABLE party DROP FOREIGN KEY FK_party_updated_by');
        $this->addSql('DROP INDEX IDX_party_cb ON party');
        $this->addSql('DROP INDEX IDX_party_ub ON party');
        $this->addSql('ALTER TABLE party DROP created_by, DROP updated_by');

        $this->addSql('ALTER TABLE category DROP FOREIGN KEY FK_category_created_by');
        $this->addSql('ALTER TABLE category DROP FOREIGN KEY FK_category_updated_by');
        $this->addSql('DROP INDEX IDX_category_cb ON category');
        $this->addSql('DROP INDEX IDX_category_ub ON category');
        $this->addSql('ALTER TABLE category DROP created_by, DROP updated_by');

        $this->addSql('ALTER TABLE concern DROP FOREIGN KEY FK_concern_created_by');
        $this->addSql('ALTER TABLE concern DROP FOREIGN KEY FK_concern_updated_by');
        $this->addSql('DROP INDEX IDX_concern_cb ON concern');
        $this->addSql('DROP INDEX IDX_concern_ub ON concern');
        $this->addSql('ALTER TABLE concern DROP created_by, DROP updated_by');

        $this->addSql('ALTER TABLE wallet DROP FOREIGN KEY FK_wallet_created_by');
        $this->addSql('ALTER TABLE wallet DROP FOREIGN KEY FK_wallet_updated_by');
        $this->addSql('DROP INDEX IDX_7D89D987DE12AB56 ON wallet');
        $this->addSql('DROP INDEX IDX_7D89D9872793CC5E ON wallet');
        $this->addSql('ALTER TABLE wallet DROP created_by, DROP updated_by');
    }
}
