<?php

declare(strict_types=1);

namespace App\Tests\Api;

use App\Home\Configuration\Entity\Category;
use App\Home\Transaction\Entity\Transaction;
use App\Home\Transaction\Entity\TransactionItem;
use App\Identity\Entity\User;
use App\Tests\Support\ApiTestCase;
use Doctrine\ORM\EntityManagerInterface;

final class TrendApiTest extends ApiTestCase
{
    public function testIndexRequiresAuth(): void
    {
        $this->requestJson('GET', '/api/reports/trend');

        $this->assertJsonResponse(401);
    }

    public function testInvalidSeriesByReturns422(): void
    {
        $this->createUser(apiToken: self::TEST_USER_TOKEN);

        $this->requestJson(
            'GET',
            '/api/reports/trend?dateFrom=2025-01-01&dateTo=2025-12-31&trendSeriesBy=foo',
            token: self::TEST_USER_TOKEN,
        );

        $this->assertJsonResponse(422);
    }

    public function testSeriesByNoneMonthlyBuckets(): void
    {
        $user = $this->createUser(apiToken: self::TEST_USER_TOKEN);
        $em   = static::getContainer()->get(EntityManagerInterface::class);

        $txJan = $this->createTransaction($em, $user, '2025-01-10', Transaction::DIRECTION_EXPENSE);
        $this->addItem($em, $user, $txJan, -10000);
        $txFeb = $this->createTransaction($em, $user, '2025-02-15', Transaction::DIRECTION_EXPENSE);
        $this->addItem($em, $user, $txFeb, -5000);
        $em->flush();

        $this->requestJson(
            'GET',
            '/api/reports/trend?dateFrom=2025-01-01&dateTo=2025-03-31&trendSeriesBy=none&trendDirections=EXPENSE',
            token: self::TEST_USER_TOKEN,
        );

        $data = $this->assertJsonResponse(200);

        self::assertSame('none', $data['seriesBy']);
        self::assertSame('month', $data['granularity']);
        // 3 kubełki (Sty, Lut, Mar) — również pusty marzec
        self::assertCount(3, $data['points']);

        $jan = $data['points'][0];
        self::assertSame('2025-01', $jan['period']);
        self::assertSame('Sty', $jan['label']);
        self::assertSame(100.0, $jan['totals']['expenses']);
        self::assertSame('Razem', $jan['series'][0]['name']);
        self::assertSame(100.0, $jan['series'][0]['expenses']);

        $mar = $data['points'][2];
        self::assertSame('2025-03', $mar['period']);
        self::assertSame(0.0, $mar['totals']['expenses']);
    }

    public function testOpenEndedDateFromOnly(): void
    {
        $user = $this->createUser(apiToken: self::TEST_USER_TOKEN);
        $em   = static::getContainer()->get(EntityManagerInterface::class);

        $txJan = $this->createTransaction($em, $user, '2025-01-10', Transaction::DIRECTION_EXPENSE);
        $this->addItem($em, $user, $txJan, -10000);
        $txFeb = $this->createTransaction($em, $user, '2025-02-15', Transaction::DIRECTION_EXPENSE);
        $this->addItem($em, $user, $txFeb, -5000);
        $em->flush();

        $this->requestJson(
            'GET',
            '/api/reports/trend?periodMode=range&dateFrom=2025-01-01&trendSeriesBy=none&trendDirections=EXPENSE',
            token: self::TEST_USER_TOKEN,
        );

        $data = $this->assertJsonResponse(200);

        self::assertSame('2025-01-01', $data['dateFrom']);
        self::assertNull($data['dateTo']);
        self::assertCount(2, $data['points']);
        self::assertSame('2025-01', $data['points'][0]['period']);
        self::assertSame('2025-02', $data['points'][1]['period']);
        self::assertSame(100.0, $data['points'][0]['totals']['expenses']);
        self::assertSame(50.0, $data['points'][1]['totals']['expenses']);
    }

    public function testOpenEndedDateToOnly(): void
    {
        $user = $this->createUser(apiToken: self::TEST_USER_TOKEN);
        $em   = static::getContainer()->get(EntityManagerInterface::class);

        $txJan = $this->createTransaction($em, $user, '2025-01-10', Transaction::DIRECTION_EXPENSE);
        $this->addItem($em, $user, $txJan, -10000);
        $txMar = $this->createTransaction($em, $user, '2025-03-20', Transaction::DIRECTION_EXPENSE);
        $this->addItem($em, $user, $txMar, -3000);
        $em->flush();

        $this->requestJson(
            'GET',
            '/api/reports/trend?periodMode=range&dateTo=2025-02-28&trendSeriesBy=none&trendDirections=EXPENSE',
            token: self::TEST_USER_TOKEN,
        );

        $data = $this->assertJsonResponse(200);

        self::assertNull($data['dateFrom']);
        self::assertSame('2025-02-28', $data['dateTo']);
        self::assertCount(2, $data['points']);
        self::assertSame('2025-01', $data['points'][0]['period']);
        self::assertSame('2025-02', $data['points'][1]['period']);
    }

    public function testSeriesByCategoryProducesSeries(): void
    {
        $user = $this->createUser(apiToken: self::TEST_USER_TOKEN);
        $em   = static::getContainer()->get(EntityManagerInterface::class);

        $food      = $this->createCategory($em, $user, 'Żywność');
        $transport = $this->createCategory($em, $user, 'Transport');

        $tx = $this->createTransaction($em, $user, '2025-01-10', Transaction::DIRECTION_EXPENSE);
        $this->addItem($em, $user, $tx, -8000, $food);
        $this->addItem($em, $user, $tx, -2000, $transport);
        $em->flush();

        $this->requestJson(
            'GET',
            sprintf(
                '/api/reports/trend?dateFrom=2025-01-01&dateTo=2025-01-31&trendSeriesBy=category&trendCategoryIds=%d,%d&trendDirections=EXPENSE',
                $food->getId(),
                $transport->getId(),
            ),
            token: self::TEST_USER_TOKEN,
        );

        $data = $this->assertJsonResponse(200);

        self::assertSame('category', $data['seriesBy']);
        self::assertCount(1, $data['points']);
        $series = $data['points'][0]['series'];
        self::assertCount(2, $series);
        self::assertSame('cat:' . $food->getId(), $series[0]['id']);
        self::assertSame('Żywność', $series[0]['name']);
        self::assertSame(80.0, $series[0]['expenses']);
        self::assertSame('Transport', $series[1]['name']);
        self::assertSame(20.0, $series[1]['expenses']);
    }

    private function createCategory(EntityManagerInterface $em, User $user, string $name): Category
    {
        $category = new Category();
        $category->setName($name);
        $category->setCreatedBy($user);
        $em->persist($category);

        return $category;
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
    ): TransactionItem {
        $item = new TransactionItem();
        $item->setTransaction($tx);
        $item->setAmountMinor($amountMinor);
        $item->setCreatedBy($user);
        if ($category !== null) {
            $item->setCategory($category);
        }
        $em->persist($item);

        return $item;
    }
}
