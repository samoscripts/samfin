<?php

declare(strict_types=1);

namespace App\Tests\Home\Import\Util;

use App\Home\Import\Util\MbankTitleParser;
use PHPUnit\Framework\TestCase;

final class MbankTitleParserTest extends TestCase
{
    private MbankTitleParser $parser;

    protected function setUp(): void
    {
        $this->parser = new MbankTitleParser();
    }

    public function testCleanTitleRemovesTransactionDateSuffixOnly(): void
    {
        $raw = 'ZAKUP PRZY UŻYCIU KARTY /LOKALIZACJA : BIEDRONKA / DATA TRANSAKCJI: 2026-06-01';

        self::assertSame(
            'ZAKUP PRZY UŻYCIU KARTY /LOKALIZACJA : BIEDRONKA /',
            $this->parser->cleanTitle($raw),
        );
        self::assertEquals(
            new \DateTimeImmutable('2026-06-01'),
            $this->parser->extractTransactionDate($raw),
        );
    }

    public function testCleanTitleWhenLocationEmptyRemovesDateSuffixOnly(): void
    {
        $raw = 'ZAKUP PRZY UŻYCIU KARTY /LOKALIZACJA    DATA TRANSAKCJI: 2026-06-01';

        self::assertSame(
            'ZAKUP PRZY UŻYCIU KARTY /LOKALIZACJA',
            $this->parser->cleanTitle($raw),
        );
        self::assertEquals(
            new \DateTimeImmutable('2026-06-01'),
            $this->parser->extractTransactionDate($raw),
        );
    }

    public function testTruncatedTitleStaysUnchanged(): void
    {
        $raw = 'JMP S.A. BIEDRONKA /SIERAKOWIC';

        self::assertSame($raw, $this->parser->cleanTitle($raw));
        self::assertNull($this->parser->extractTransactionDate($raw));
    }

    public function testCleanTitlePreservesSlashInContractNumber(): void
    {
        $raw = 'PRZELEW ZEWNĘTRZNY DO ZUS UMOWA 600/3577/2019';

        self::assertSame($raw, $this->parser->cleanTitle($raw));
        self::assertNull($this->parser->extractTransactionDate($raw));
    }

    public function testCleanTitleWithoutSuffixUnchanged(): void
    {
        $raw = 'OPŁATA ZA PROWADZENIE RACHUNKU';

        self::assertSame($raw, $this->parser->cleanTitle($raw));
        self::assertNull($this->parser->extractTransactionDate($raw));
    }

    public function testCleanTitleRemovesStandaloneTransactionDateSuffix(): void
    {
        $raw = 'ZAKUP PRZY UŻYCIU KARTY DATA TRANSAKCJI: 2026-06-01';

        self::assertSame('ZAKUP PRZY UŻYCIU KARTY', $this->parser->cleanTitle($raw));
    }

    public function testNullInputReturnsNull(): void
    {
        self::assertNull($this->parser->cleanTitle(null));
        self::assertNull($this->parser->extractTransactionDate(null));
    }
}
