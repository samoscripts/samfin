<?php

namespace App\Home\Import\Provider;

use App\Home\Import\DTO\ImportErrorData;
use App\Home\Import\DTO\ImportResult;
use App\Home\Import\Mapper\CsvFormatMapperInterface;
use App\Home\Import\Mapper\Mbank\MbankCsvFormatMapperRegistry;
use App\Home\Import\Util\CsvEncodingNormalizer;
use App\Home\Import\Util\MbankCsvRowBoundary;
use Symfony\Component\DependencyInjection\Attribute\AutoconfigureTag;

#[AutoconfigureTag('app.bank_import_provider')]
class MbankCsvImportProvider implements BankImportProviderInterface
{
    private const EXPECTED_DATA_COLUMNS = 8;

    public function __construct(
        private readonly MbankCsvFormatMapperRegistry $mapperRegistry,
        private readonly MbankCsvRowBoundary $rowBoundary,
        private readonly CsvEncodingNormalizer $encodingNormalizer,
    ) {}

    public function getCode(): string { return 'MBANK'; }

    public function getDisplayName(): string { return 'mBank S.A.'; }

    public function parseFile(string $filePath): ImportResult
    {
        [$resolvedPath, $isTemp] = $this->resolveUtf8FilePath($filePath);

        try {
            return $this->parseUtf8File($resolvedPath);
        } finally {
            if ($isTemp) {
                @unlink($resolvedPath);
            }
        }
    }

    private function parseUtf8File(string $filePath): ImportResult
    {
        $errors = [];

        $file = new \SplFileObject($filePath, 'r');
        $file->setFlags(\SplFileObject::DROP_NEW_LINE);

        $detectedClientName     = null;
        $detectedAccountNumber  = null;
        $detectedAccountDisplay = null;
        $periodFrom             = null;
        $periodTo               = null;
        $accounts               = [];
        $detectedCurrency       = null;
        $dataStartLine          = null;
        $csvFormat              = null;
        $activeMapper           = null;
        $lineNo                 = 0;
        $pendingNextLine        = null;

        while (!$file->eof()) {
            $line = $this->readNextLine($file, $pendingNextLine, $lineNo);
            if ($line === null) {
                break;
            }

            $cols = $this->parseCsvLine($line);

            if ($this->startsWithMarker($cols, '#Klient')) {
                $next = $this->readNextLine($file, $pendingNextLine, $lineNo);
                $detectedClientName = $this->normalizeClientName($this->parseCsvLine($next ?? '')[0] ?? '');
                continue;
            }

            if ($this->startsWithMarker($cols, '#Za okres:')) {
                $nextLine = $this->readNextLine($file, $pendingNextLine, $lineNo) ?? '';
                $nextCols = $this->parseCsvLine($nextLine);

                $candidate1 = trim($nextCols[0] ?? '');
                $candidate2 = trim($nextCols[1] ?? '');

                if ($candidate1 !== '' && $candidate2 !== '') {
                    $periodFrom = $this->parsePeriodDate($candidate1);
                    $periodTo   = $this->parsePeriodDate($candidate2);
                } elseif ($candidate1 !== '') {
                    $line2      = $this->readNextLine($file, $pendingNextLine, $lineNo) ?? '';
                    $periodFrom = $this->parsePeriodDate($candidate1);
                    $periodTo   = $this->parsePeriodDate($line2);
                }

                if ($periodFrom === null || $periodTo === null) {
                    $errors[] = new ImportErrorData(
                        scope: 'HEADER',
                        code: 'PERIOD_NOT_DETECTED',
                        message: 'Nie udało się odczytać okresu (#Za okres) z nagłówka pliku CSV.',
                        fatal: false,
                    );
                }
                continue;
            }

            if ($this->startsWithMarker($cols, '#dla rachunków:')) {
                while (!$file->eof()) {
                    $nextLine = $this->readNextLine($file, $pendingNextLine, $lineNo);
                    if ($nextLine === null) {
                        break;
                    }
                    $trimmed = trim($nextLine);
                    if ($trimmed === '' || str_starts_with($trimmed, '#')) {
                        $pendingNextLine = $nextLine;
                        break;
                    }
                    $nextCols   = $this->parseCsvLine($nextLine);
                    $rawAccount = $this->normalizeAccountRaw($nextCols[0] ?? '');
                    if ($rawAccount !== '') {
                        $accounts[] = $rawAccount;
                    }
                }
                continue;
            }

            if ($this->startsWithMarker($cols, '#Numer rachunku')) {
                $next     = $this->readNextLine($file, $pendingNextLine, $lineNo) ?? '';
                $nextCols = $this->parseCsvLine($next);
                $rawAccount = $this->normalizeAccountRaw($nextCols[0] ?? '');
                if ($rawAccount !== '') {
                    $accounts[] = $rawAccount;
                }
                continue;
            }

            if ($this->startsWithMarker($cols, '#Waluta')) {
                $next     = $this->readNextLine($file, $pendingNextLine, $lineNo);
                $nextCols = $this->parseCsvLine($next ?? '');
                $currency = trim($nextCols[0] ?? '');
                if ($currency !== '') {
                    $detectedCurrency = $currency;
                }
                continue;
            }

            if ($this->startsWithMarker($cols, '#Data księgowania')) {
                $activeMapper = $this->mapperRegistry->resolveForHeader($cols);
                if ($activeMapper === null) {
                    $errors[] = new ImportErrorData(
                        scope: 'HEADER',
                        code: 'DATA_SECTION_UNSUPPORTED',
                        message: 'Nieobsługiwany układ nagłówka sekcji danych w pliku CSV mBank.',
                        fatal: true,
                    );
                    break;
                }

                $csvFormat     = $activeMapper->getFormatVersion();
                $dataStartLine = $lineNo + 1;
                break;
            }
        }

        if ($detectedCurrency !== null && $detectedCurrency !== 'PLN') {
            $errors[] = new ImportErrorData(
                scope: 'HEADER',
                code: 'UNSUPPORTED_CURRENCY',
                message: "Obsługiwana jest tylko waluta PLN w nagłówku #Waluta (wykryto: {$detectedCurrency}).",
                fatal: true,
            );
        }

        if (count($accounts) === 0) {
            $errors[] = new ImportErrorData(
                scope: 'HEADER',
                code: 'ACCOUNT_NOT_DETECTED',
                message: 'Nie wykryto rachunku w nagłówku pliku CSV.',
                fatal: true,
            );
        } else {
            $raw                      = $this->normalizeAccountRaw($accounts[0]);
            $detectedAccountNumber  = $this->extractAccountDigits($raw);
            $detectedAccountDisplay = $raw;
        }

        if ($dataStartLine === null) {
            $errors[] = new ImportErrorData(
                scope: 'HEADER',
                code: 'DATA_SECTION_NOT_FOUND',
                message: 'Nie znaleziono sekcji danych w pliku CSV. Nieobsługiwany format.',
                fatal: true,
            );
        }

        $rows = [];
        $hasFatalHeaderError = array_reduce(
            $errors,
            fn(bool $carry, ImportErrorData $e) => $carry || $e->fatal,
            false,
        );

        if ($dataStartLine !== null && $activeMapper !== null && !$hasFatalHeaderError) {
            $rows = $this->parseDataRows($file, $activeMapper, $dataStartLine, $pendingNextLine, $lineNo, $errors);
        }

        $headerValid = !array_reduce(
            $errors,
            fn(bool $carry, ImportErrorData $e) => $carry || $e->fatal,
            false,
        );

        return new ImportResult(
            headerValid: $headerValid,
            csvFormat: $csvFormat,
            detectedClientName: $detectedClientName,
            detectedAccountNumber: $detectedAccountNumber,
            detectedAccountDisplay: $detectedAccountDisplay,
            periodFrom: $periodFrom,
            periodTo: $periodTo,
            rows: $rows,
            errors: $errors,
        );
    }

    /**
     * @param ImportErrorData[] $errors
     * @return list<\App\Home\Import\DTO\NormalizedImportRow>
     */
    private function parseDataRows(
        \SplFileObject $file,
        CsvFormatMapperInterface $mapper,
        int $dataStartLine,
        ?string &$pendingNextLine,
        int &$lineNo,
        array &$errors,
    ): array {
        $rows = [];

        if ($pendingNextLine !== null) {
            $lineNo = $dataStartLine - 1;
            $line   = $pendingNextLine;
            $pendingNextLine = null;
        } else {
            $line = null;
        }

        while (true) {
            if ($line === null) {
                $line = $this->readNextLine($file, $pendingNextLine, $lineNo);
                if ($line === null) {
                    break;
                }
            }

            $currentLine = $line;
            $line        = null;

            if (trim($currentLine) === '') {
                continue;
            }

            if ($this->rowBoundary->isMetadataLine($currentLine)) {
                break;
            }

            if ($this->rowBoundary->isDisclaimerLine($currentLine)) {
                break;
            }

            while (!$this->rowBoundary->isCsvRecordComplete($currentLine, self::EXPECTED_DATA_COLUMNS)) {
                $nextPart = $this->readNextLine($file, $pendingNextLine, $lineNo);
                if ($nextPart === null) {
                    break;
                }
                if ($this->rowBoundary->looksLikeNewDataRowStart($nextPart)) {
                    break;
                }
                $currentLine .= "\n" . $nextPart;
            }

            if ($this->rowBoundary->isMetadataLine($currentLine)) {
                break;
            }

            if ($this->rowBoundary->isDisclaimerLine($currentLine)) {
                break;
            }

            $rowResult = $mapper->mapDataLine($lineNo, $this->parseCsvLine($currentLine));
            if (!empty($rowResult['stopParsing'])) {
                break;
            }

            if ($rowResult['fatalError'] !== null) {
                $errors[] = $rowResult['fatalError'];
                return [];
            }

            if ($rowResult['row'] !== null) {
                $rows[] = $rowResult['row'];
            }
        }

        return $rows;
    }

    /** @return array{0: string, 1: bool} */
    private function resolveUtf8FilePath(string $filePath): array
    {
        return $this->encodingNormalizer->resolveUtf8FilePath($filePath);
    }

    private function readNextLine(\SplFileObject $file, ?string &$pendingNextLine, int &$lineNo): ?string
    {
        if ($pendingNextLine !== null) {
            $line            = $pendingNextLine;
            $pendingNextLine = null;
            $lineNo++;
            return $line;
        }

        if ($file->eof()) {
            return null;
        }

        $rawLine = $file->fgets();
        if ($rawLine === false) {
            return null;
        }

        $lineNo++;

        return rtrim($rawLine, "\r\n");
    }

    public function normalizeClientName(string $raw): string
    {
        $clean = preg_replace('/[^a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ ]/u', '', $raw);
        $clean = preg_replace('/\s+/', ' ', $clean ?? '');

        return trim($clean ?? '');
    }

    private function parseCsvLine(string $line): array
    {
        $result = str_getcsv($line, ';', '"');

        return array_map('trim', $result);
    }

    private function startsWithMarker(array $cols, string $marker): bool
    {
        $first       = ltrim($cols[0] ?? '', '#');
        $first       = rtrim($first, ':');
        $checkMarker = ltrim($marker, '#');
        $checkMarker = rtrim($checkMarker, ':');

        return mb_strtolower(trim($first)) === mb_strtolower(trim($checkMarker));
    }

    private function parsePeriodDate(string $raw): ?\DateTimeImmutable
    {
        $clean = trim(trim($raw), ';');
        $dt = \DateTimeImmutable::createFromFormat('d.m.Y', $clean);
        if ($dt !== false) {
            return $dt->setTime(0, 0, 0);
        }
        $dt = \DateTimeImmutable::createFromFormat('Y-m-d', $clean);
        if ($dt !== false) {
            return $dt->setTime(0, 0, 0);
        }

        return null;
    }

    private function normalizeAccountRaw(string $raw): string
    {
        $clean = preg_replace('/[\x{00A0}\x{2007}\x{202F}]+/u', ' ', $raw);
        $clean = preg_replace('/\s+/u', ' ', $clean ?? '');

        return trim($clean ?? '');
    }

    private function extractAccountDigits(string $raw): string
    {
        $raw = $this->normalizeAccountRaw($raw);
        if (preg_match('/(\d[\d\s]{15,})/', $raw, $match)) {
            return preg_replace('/\D+/', '', $match[1]) ?? '';
        }

        return preg_replace('/\D+/', '', $raw) ?? '';
    }
}
