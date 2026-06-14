<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260615120000 extends AbstractMigration
{
    private const SEED_TAG = 'seed:Version20260615120000';

    public function getDescription(): string
    {
        return 'Seed default category tree (income + expense groups).';
    }

    public function up(Schema $schema): void
    {
        $exists = $this->connection->fetchOne(
            'SELECT 1 FROM category WHERE description = ? LIMIT 1',
            [self::SEED_TAG],
        );
        if ($exists) {
            return;
        }

        $adminId = $this->connection->fetchOne(
            'SELECT id FROM app_user WHERE active = 1 ORDER BY id ASC LIMIT 1',
        );
        if ($adminId === false) {
            throw new \RuntimeException('Brak użytkownika app_user — uruchom migrację seed admina przed kategoriami.');
        }
        $adminId = (int) $adminId;
        $now     = (new \DateTimeImmutable())->format('Y-m-d H:i:s');

        foreach (self::categoryTree() as $group) {
            $this->connection->insert('category', [
                'name'        => $group['name'],
                'type'        => $group['type'],
                'parent_id'   => null,
                'description' => self::SEED_TAG,
                'active'      => 1,
                'created_by'  => $adminId,
                'updated_by'  => null,
                'created_at'  => $now,
                'updated_at'  => $now,
            ]);
            $parentId = (int) $this->connection->lastInsertId();

            foreach ($group['children'] as $childName) {
                $this->connection->insert('category', [
                    'name'        => $childName,
                    'type'        => $group['type'],
                    'parent_id'   => $parentId,
                    'description' => self::SEED_TAG,
                    'active'      => 1,
                    'created_by'  => $adminId,
                    'updated_by'  => null,
                    'created_at'  => $now,
                    'updated_at'  => $now,
                ]);
            }
        }
    }

    public function down(Schema $schema): void
    {
        $this->addSql(
            'DELETE FROM category WHERE description = ? AND parent_id IS NOT NULL',
            [self::SEED_TAG],
        );
        $this->addSql(
            'DELETE FROM category WHERE description = ? AND parent_id IS NULL',
            [self::SEED_TAG],
        );
    }

    /** @return list<array{name: string, type: string, children: list<string>}> */
    private static function categoryTree(): array
    {
        return [
            [
                'name'     => 'Przychody',
                'type'     => 'INCOME',
                'children' => [
                    'Wynagrodzenie',
                    'Działalność',
                    'Salon Basi',
                    'Samsoft',
                    'Premia',
                    'Zwrot',
                    'Odsetki',
                    'Sprzedaż',
                    'Prezent',
                    '800+',
                    'Inne świadczenia',
                ],
            ],
            [
                'name'     => 'Dom i rachunki',
                'type'     => 'EXPENSE',
                'children' => [
                    'Prąd',
                    'Gaz',
                    'Woda',
                    'Ogrzewanie',
                    'Śmieci',
                    'Czynsz',
                    'Podatek od nieruchomości',
                    'Internet',
                    'Telefon',
                    'Telewizja',
                ],
            ],
            [
                'name'     => 'Spożywcze',
                'type'     => 'EXPENSE',
                'children' => [
                    'Lidl',
                    'Biedronka',
                    'Kaufland',
                    'Aldi',
                    'Carrefour',
                    'Zakupy spożywcze',
                    'Piekarnia',
                    'Mięso i wędliny',
                ],
            ],
            [
                'name'     => 'Restauracje',
                'type'     => 'EXPENSE',
                'children' => [
                    'Restauracje',
                    'Fast food',
                    'Kawiarnie',
                    'Pizza',
                    'Na wynos',
                ],
            ],
            [
                'name'     => 'Samochód',
                'type'     => 'EXPENSE',
                'children' => [
                    'Paliwo',
                    'Serwis',
                    'Naprawy',
                    'Opony',
                    'Ubezpieczenie',
                    'Myjnia',
                    'Parking',
                    'Autostrady',
                ],
            ],
            [
                'name'     => 'Zdrowie',
                'type'     => 'EXPENSE',
                'children' => [
                    'Leki',
                    'Lekarz',
                    'Dentysta',
                    'Badania',
                    'Okulary',
                    'Apteka',
                ],
            ],
            [
                'name'     => 'Sport',
                'type'     => 'EXPENSE',
                'children' => [
                    'Siłownia',
                    'Bieganie',
                    'Garmin',
                    'Odżywki',
                    'Sprzęt sportowy',
                    'Basen',
                ],
            ],
            [
                'name'     => 'Turystyka',
                'type'     => 'EXPENSE',
                'children' => [
                    'Hotele',
                    'Booking',
                    'Loty',
                    'Paliwo wyjazdowe',
                    'Tatry',
                    'Wakacje',
                    'Atrakcje',
                ],
            ],
            [
                'name'     => 'Dom',
                'type'     => 'EXPENSE',
                'children' => [
                    'Meble',
                    'RTV AGD',
                    'Remont',
                    'Ogród',
                    'Narzędzia',
                    'Oświetlenie',
                    'Dekoracje',
                ],
            ],
            [
                'name'     => 'Budowa',
                'type'     => 'EXPENSE',
                'children' => [
                    'Kostka brukowa',
                    'Ogrodzenie',
                    'Beton',
                    'Materiały',
                    'Wypożyczenie sprzętu',
                ],
            ],
            [
                'name'     => 'Ubrania',
                'type'     => 'EXPENSE',
                'children' => [
                    'Ubrania',
                    'Buty',
                    'Dodatki',
                ],
            ],
            [
                'name'     => 'Kosmetyki',
                'type'     => 'EXPENSE',
                'children' => [
                    'Rossmann',
                    'Hebe',
                    'Perfumy',
                    'Chemia',
                ],
            ],
            [
                'name'     => 'Salon fryzjerski',
                'type'     => 'EXPENSE',
                'children' => [
                    'Materiały',
                    'Hurtownia',
                    'Kosmetyki',
                    'Wyposażenie',
                    'Marketing',
                    'Opłaty',
                ],
            ],
            [
                'name'     => 'Dziecko',
                'type'     => 'EXPENSE',
                'children' => [
                    'Szkoła',
                    'Korepetycje',
                    'Kieszonkowe',
                    'Ubrania',
                    'Zabawki',
                    'Prezenty',
                    'Wycieczki',
                ],
            ],
            [
                'name'     => 'Zwierzęta',
                'type'     => 'EXPENSE',
                'children' => [
                    'Karma',
                    'Weterynarz',
                    'Akcesoria',
                ],
            ],
            [
                'name'     => 'Rozrywka',
                'type'     => 'EXPENSE',
                'children' => [
                    'Kino',
                    'Gry',
                    'Steam',
                    'PlayStation',
                    'Książki',
                    'Muzyka',
                ],
            ],
            [
                'name'     => 'Elektronika',
                'type'     => 'EXPENSE',
                'children' => [
                    'Komputery',
                    'Telefony',
                    'Akcesoria',
                    'Oprogramowanie',
                ],
            ],
            [
                'name'     => 'Programowanie',
                'type'     => 'EXPENSE',
                'children' => [
                    'Hosting',
                    'Domeny',
                    'VPS',
                    'AI',
                    'Cursor',
                    'ChatGPT',
                    'Claude',
                    'GitHub',
                ],
            ],
            [
                'name'     => 'Podatki i urzędy',
                'type'     => 'EXPENSE',
                'children' => [
                    'PIT',
                    'VAT',
                    'ZUS',
                    'Urząd Skarbowy',
                    'Opłaty urzędowe',
                ],
            ],
            [
                'name'     => 'Finanse',
                'type'     => 'EXPENSE',
                'children' => [
                    'Kredyty',
                    'Prowizje',
                    'Opłaty bankowe',
                    'Odsetki',
                    'Inwestycje',
                ],
            ],
            [
                'name'     => 'Prezenty',
                'type'     => 'EXPENSE',
                'children' => [
                    'Urodziny',
                    'Święta',
                    'Rocznice',
                ],
            ],
            [
                'name'     => 'Inne',
                'type'     => 'EXPENSE',
                'children' => [
                    'Nieprzypisane',
                    'Pozostałe',
                ],
            ],
        ];
    }
}
