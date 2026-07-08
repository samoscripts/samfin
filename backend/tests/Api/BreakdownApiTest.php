<?php

declare(strict_types=1);

namespace App\Tests\Api;

use App\Home\Configuration\Entity\Category;
use App\Home\Configuration\Entity\Wallet;
use App\Home\Transaction\Entity\Transaction;
use App\Home\Transaction\Entity\TransactionItem;
use App\Identity\Entity\User;
use App\Tests\Support\ApiTestCase;
use Doctrine\ORM\EntityManagerInterface;

final class BreakdownApiTest extends ApiTestCase
{
    public function testIndexRequiresAuth(): void
    {
        $this->requestJson('GET', '/api/reports/breakdown');

        $this->assertJsonResponse(401);
    }

    public function testInvalidDateRangeReturns422(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson(
            'GET',
            '/api/reports/breakdown?dateFrom=2025-02-01&dateTo=2025-01-01',
            token: self::TEST_USER_TOKEN,
        );

        $this->assertJsonResponse(422);
    }

    public function testOpenEndedDateFromOnly(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson(
            'GET',
            '/api/reports/breakdown?periodMode=range&dateFrom=2025-01-01&groupBy=categoryMain',
            token: self::TEST_USER_TOKEN,
        );

        $body = $this->assertJsonResponse(200);
        self::assertSame('2025-01-01', $body['dateFrom']);
        self::assertNull($body['dateTo']);
    }

    public function testInvalidGroupByReturns422(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson(
            'GET',
            '/api/reports/breakdown?dateFrom=2025-01-01&dateTo=2025-01-31&groupBy=foo',
            token: self::TEST_USER_TOKEN,
        );

        $this->assertJsonResponse(422);
    }

    public function testGroupByCategoryMainAggregatesItems(): void
    {
        $user = $this->createUser(apiToken: self::TEST_USER_TOKEN);
        $em   = static::getContainer()->get(EntityManagerInterface::class);

        $food    = $this->createCategory($em, $user, 'Żywność');
        $bread   = $this->createCategory($em, $user, 'Pieczywo', $food);
        $veggies = $this->createCategory($em, $user, 'Warzywa', $food);
        $wallet  = $this->createWallet($em, $user, 'Budżet domowy');

        // Żywność: 100 (Pieczywo) + 60 (Warzywa) = 160
        $tx1 = $this->createTransaction($em, $user, '2025-01-05', Transaction::DIRECTION_EXPENSE);
        $this->addItem($em, $user, $tx1, -10000, $bread, $wallet);
        $this->addItem($em, $user, $tx1, -6000, $veggies, $wallet);

        // Pozycja bez kategorii: 40
        $tx2 = $this->createTransaction($em, $user, '2025-01-10', Transaction::DIRECTION_EXPENSE);
        $this->addItem($em, $user, $tx2, -4000, null, $wallet);

        // Przychód — nie powinien trafić do EXPENSE
        $tx3 = $this->createTransaction($em, $user, '2025-01-12', Transaction::DIRECTION_INCOME);
        $this->addItem($em, $user, $tx3, 50000, null, $wallet);

        $em->flush();

        $this->requestJson(
            'GET',
            '/api/reports/breakdown?dateFrom=2025-01-01&dateTo=2025-01-31&groupBy=categoryMain&reportDirection=EXPENSE',
            token: self::TEST_USER_TOKEN,
        );

        $data = $this->assertJsonResponse(200);

        self::assertSame('categoryMain', $data['groupBy']);
        self::assertSame('EXPENSE', $data['direction']);
        self::assertSame(200.0, $data['total']);
        self::assertSame(3, $data['itemCount']);
        self::assertSame(40.0, $data['unclassifiedAmount']);

        // Największa grupa pierwsza: Żywność 160
        self::assertSame($food->getId(), $data['groups'][0]['id']);
        self::assertSame('Żywność', $data['groups'][0]['name']);
        self::assertSame(160.0, $data['groups'][0]['amount']);
        self::assertSame(2, $data['groups'][0]['itemCount']);
        self::assertSame(80.0, $data['groups'][0]['share']);

        $nullGroup = array_values(array_filter($data['groups'], static fn ($g) => $g['id'] === null));
        self::assertCount(1, $nullGroup);
        self::assertSame('Bez kategorii', $nullGroup[0]['name']);
        self::assertSame(40.0, $nullGroup[0]['amount']);
    }

    public function testGroupBySubCategoryDrillDown(): void
    {
        $user = $this->createUser(apiToken: self::TEST_USER_TOKEN);
        $em   = static::getContainer()->get(EntityManagerInterface::class);

        $food    = $this->createCategory($em, $user, 'Żywność');
        $bread   = $this->createCategory($em, $user, 'Pieczywo', $food);
        $veggies = $this->createCategory($em, $user, 'Warzywa', $food);
        $transport = $this->createCategory($em, $user, 'Transport');
        $fuel      = $this->createCategory($em, $user, 'Paliwo', $transport);

        $tx = $this->createTransaction($em, $user, '2025-01-05', Transaction::DIRECTION_EXPENSE);
        $this->addItem($em, $user, $tx, -10000, $bread);
        $this->addItem($em, $user, $tx, -6000, $veggies);
        $this->addItem($em, $user, $tx, -9000, $fuel);
        $em->flush();

        $this->requestJson(
            'GET',
            sprintf(
                '/api/reports/breakdown?dateFrom=2025-01-01&dateTo=2025-01-31&groupBy=categorySub&categoryId=%d&reportDirection=EXPENSE',
                $food->getId(),
            ),
            token: self::TEST_USER_TOKEN,
        );

        $data = $this->assertJsonResponse(200);

        // Tylko dzieci Żywności: Pieczywo 100 + Warzywa 60 = 160 (bez Paliwa)
        self::assertSame(160.0, $data['total']);
        self::assertCount(2, $data['groups']);
        $names = array_map(static fn ($g) => $g['name'], $data['groups']);
        self::assertContains('Pieczywo', $names);
        self::assertContains('Warzywa', $names);
        self::assertNotContains('Paliwo', $names);
    }

    public function testGroupByWalletWithNullBucket(): void
    {
        $user = $this->createUser(apiToken: self::TEST_USER_TOKEN);
        $em   = static::getContainer()->get(EntityManagerInterface::class);

        $home = $this->createWallet($em, $user, 'Budżet domowy');

        $tx = $this->createTransaction($em, $user, '2025-01-05', Transaction::DIRECTION_EXPENSE);
        $this->addItem($em, $user, $tx, -12000, null, $home);
        $this->addItem($em, $user, $tx, -3000, null, null);
        $em->flush();

        $this->requestJson(
            'GET',
            '/api/reports/breakdown?dateFrom=2025-01-01&dateTo=2025-01-31&groupBy=wallet&reportDirection=EXPENSE',
            token: self::TEST_USER_TOKEN,
        );

        $data = $this->assertJsonResponse(200);
        self::assertSame(150.0, $data['total']);

        $nullGroup = array_values(array_filter($data['groups'], static fn ($g) => $g['id'] === null));
        self::assertCount(1, $nullGroup);
        self::assertSame('Bez portfela', $nullGroup[0]['name']);
        self::assertSame(30.0, $nullGroup[0]['amount']);
    }

    private function createCategory(
        EntityManagerInterface $em,
        User $user,
        string $name,
        ?Category $parent = null,
    ): Category {
        $category = new Category();
        $category->setName($name);
        $category->setCreatedBy($user);
        if ($parent !== null) {
            $category->setParent($parent);
        }
        $em->persist($category);

        return $category;
    }

    private function createWallet(EntityManagerInterface $em, User $user, string $name): Wallet
    {
        $wallet = new Wallet();
        $wallet->setName($name);
        $wallet->setCreatedBy($user);
        $em->persist($wallet);

        return $wallet;
    }

    private function createTransaction(
        EntityManagerInterface $em,
        User $user,
        string $date,
        string $direction,
    ): Transaction {
        $tx = new Transaction();
        $tx->setTransDate(new \DateTimeImmutable($date));
        $tx->setDirection($direction);
        $tx->setStatus(Transaction::STATUS_CLASSIFIED);
        $tx->setCreatedBy($user);
        $em->persist($tx);

        return $tx;
    }

    private function addItem(
        EntityManagerInterface $em,
        User $user,
        Transaction $tx,
        int $amountMinor,
        ?Category $category = null,
        ?Wallet $wallet = null,
    ): TransactionItem {
        $item = new TransactionItem();
        $item->setTransaction($tx);
        $item->setAmountMinor($amountMinor);
        $item->setCreatedBy($user);
        if ($category !== null) {
            $item->setCategory($category);
        }
        if ($wallet !== null) {
            $item->setWallet($wallet);
        }
        $em->persist($item);

        return $item;
    }
}
