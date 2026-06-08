<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260607193500 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Rename created_by / updated_by indexes to Doctrine naming convention.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE category RENAME INDEX idx_category_cb TO IDX_64C19C1DE12AB56');
        $this->addSql('ALTER TABLE category RENAME INDEX idx_category_ub TO IDX_64C19C116FE72E1');
        $this->addSql('ALTER TABLE concern  RENAME INDEX idx_concern_cb  TO IDX_281EFBA8DE12AB56');
        $this->addSql('ALTER TABLE concern  RENAME INDEX idx_concern_ub  TO IDX_281EFBA816FE72E1');
        $this->addSql('ALTER TABLE wallet   RENAME INDEX idx_7d89d987de12ab56 TO IDX_7C68921FDE12AB56');
        $this->addSql('ALTER TABLE wallet   RENAME INDEX idx_7d89d9872793cc5e TO IDX_7C68921F16FE72E1');
        $this->addSql('ALTER TABLE party    RENAME INDEX idx_party_cb    TO IDX_89954EE0DE12AB56');
        $this->addSql('ALTER TABLE party    RENAME INDEX idx_party_ub    TO IDX_89954EE016FE72E1');
        $this->addSql('ALTER TABLE party_bank_account RENAME INDEX idx_pba_cb TO IDX_CC62B8D9DE12AB56');
        $this->addSql('ALTER TABLE party_bank_account RENAME INDEX idx_pba_ub TO IDX_CC62B8D916FE72E1');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE party_bank_account RENAME INDEX idx_cc62b8d9de12ab56 TO IDX_pba_cb');
        $this->addSql('ALTER TABLE party_bank_account RENAME INDEX idx_cc62b8d916fe72e1 TO IDX_pba_ub');
        $this->addSql('ALTER TABLE party    RENAME INDEX idx_89954ee0de12ab56 TO IDX_party_cb');
        $this->addSql('ALTER TABLE party    RENAME INDEX idx_89954ee016fe72e1 TO IDX_party_ub');
        $this->addSql('ALTER TABLE wallet   RENAME INDEX idx_7c68921fde12ab56 TO IDX_7D89D987DE12AB56');
        $this->addSql('ALTER TABLE wallet   RENAME INDEX idx_7c68921f16fe72e1 TO IDX_7D89D9872793CC5E');
        $this->addSql('ALTER TABLE concern  RENAME INDEX idx_281efba8de12ab56 TO IDX_concern_cb');
        $this->addSql('ALTER TABLE concern  RENAME INDEX idx_281efba816fe72e1 TO IDX_concern_ub');
        $this->addSql('ALTER TABLE category RENAME INDEX idx_64c19c1de12ab56  TO IDX_category_cb');
        $this->addSql('ALTER TABLE category RENAME INDEX idx_64c19c116fe72e1  TO IDX_category_ub');
    }
}
