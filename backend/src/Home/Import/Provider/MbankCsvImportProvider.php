<?php

namespace App\Home\Import\Provider;

use App\Home\Import\DTO\ImportErrorData;
use App\Home\Import\DTO\ImportResult;
use App\Home\Import\DTO\ImportRowData;
use App\Home\Import\Util\CounterpartyAccountExtractor;
use Symfony\Component\DependencyInjection\Attribute\AutoconfigureTag;

#[AutoconfigureTag('app.bank_import_provider')]
class MbankCsvImportProvider implements BankImportProviderInterface
{
    public function __construct(
        private readonly CounterpartyAccountExtractor $counterpartyAccountExtractor,
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
                    $periodFrom = $this->parseDate($candidate1);
                    $periodTo   = $this->parseDate($candidate2);
                } elseif ($candidate1 !== '') {
                    $line2      = $this->readNextLine($file, $pendingNextLine, $lineNo) ?? '';
                    $periodFrom = $this->parseDate($candidate1);
                    $periodTo   = $this->parseDate($line2);
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
                    $rawAccount = trim($nextCols[0] ?? '');
                    if ($rawAccount !== '') {
                        $accounts[] = $rawAccount;
                    }
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

            if ($this->startsWithMarker($cols, '#Data operacji')) {
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
        } elseif (count($accounts) > 1) {
            $errors[] = new ImportErrorData(
                scope: 'HEADER',
                code: 'MULTI_ACCOUNT_CSV',
                message: 'Plik zawiera więcej niż jeden rachunek. Wygeneruj plik CSV osobno dla każdego rachunku.',
                fatal: true,
            );
        } else {
            $raw = $accounts[0];
            if (preg_match('/(\d[\d\s]{15,})$/', $raw, $m)) {
                $detectedAccountNumber  = preg_replace('/\s+/', '', $m[1]);
                $detectedAccountDisplay = $raw;
            } else {
                $detectedAccountNumber  = preg_replace('/\s+/', '', $raw);
                $detectedAccountDisplay = $raw;
            }
        }

        if ($dataStartLine === null) {
            $errors[] = new ImportErrorData(
                scope: 'HEADER',
                code: 'DATA_SECTION_NOT_FOUND',
                message: 'Nie znaleziono sekcji danych (#Data operacji) w pliku CSV. Nieobsługiwany format.',
                fatal: true,
            );
        }

        $rows = [];
        $hasFatalHeaderError = array_reduce(
            $errors,
            fn(bool $carry, ImportErrorData $e) => $carry || $e->fatal,
            false,
        );

        if ($dataStartLine !== null && !$hasFatalHeaderError) {
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

                $rowResult = $this->parseDataLine($lineNo, $currentLine);
                if ($rowResult['fatalError'] !== null) {
                    $errors[] = $rowResult['fatalError'];
                    $rows     = [];
                    break;
                }

                if ($rowResult['row'] !== null) {
                    $rows[] = $rowResult['row'];
                }
            }
        }

        $headerValid = !array_reduce(
            $errors,
            fn(bool $carry, ImportErrorData $e) => $carry || $e->fatal,
            false,
        );

        return new ImportResult(
            headerValid: $headerValid,
            detectedClientName: $detectedClientName,
            detectedAccountNumber: $detectedAccountNumber,
            detectedAccountDisplay: $detectedAccountDisplay,
            periodFrom: $periodFrom,
            periodTo: $periodTo,
            rows: $rows,
            errors: $errors,
        );
    }

    /** @return array{row: ?ImportRowData, fatalError: ?ImportErrorData} */
    private function parseDataLine(int $lineNo, string $line): array
    {
        $cols     = $this->normalizeDataColumns($this->parseCsvLine($line));
        $colCount = count($cols);

        if ($colCount < 5) {
            return [
                'row' => null,
                'fatalError' => new ImportErrorData(
                    scope: 'ROW',
                    code: 'CSV_COLUMN_LAYOUT_MISMATCH',
                    message: sprintf(
                        'Import przerwany: wiersz %d ma za mało kolumn (%d z 5 wymaganych: data operacji, opis, rachunek, kategoria banku, kwota). Sprawdź format pliku CSV mBank.',
                        $lineNo,
                        $colCount,
                    ),
                    lineNo: $lineNo,
                    fatal: true,
                ),
            ];
        }

        if ($colCount > 5) {
            return [
                'row' => null,
                'fatalError' => new ImportErrorData(
                    scope: 'ROW',
                    code: 'CSV_COLUMN_LAYOUT_MISMATCH',
                    message: sprintf(
                        'Import przerwany: wiersz %d zawiera dodatkowe kolumny (%d zamiast 5). Obsługiwany jest wyłącznie standardowy układ eksportu mBank.',
                        $lineNo,
                        $colCount,
                    ),
                    lineNo: $lineNo,
                    fatal: true,
                ),
            ];
        }

        $dateStr                = trim($cols[0]);
        $description            = trim($cols[1]);
        $ownAccountLabelRaw     = trim($cols[2]);
        $bankCategory           = trim($cols[3]);
        $amountRaw              = trim($cols[4]);
        $counterpartyAccountRaw = $this->counterpartyAccountExtractor->extract($description);

        if ($dateStr === '') {
            return [
                'row' => new ImportRowData(
                    lineNo: $lineNo,
                    operationDate: null,
                    descriptionRaw: $description ?: null,
                    ownAccountLabelRaw: $ownAccountLabelRaw ?: null,
                    counterpartyAccountRaw: $counterpartyAccountRaw,
                    bankCategoryRaw: $bankCategory ?: null,
                    amountRaw: $amountRaw ?: null,
                    amountMinor: null,
                    parseStatus: 'ERROR',
                    parseError: 'Brak daty operacji — linia pominięta.',
                ),
                'fatalError' => null,
            ];
        }

        $parseStatus   = 'OK';
        $parseError    = null;
        $operationDate = null;
        $amountMinor   = null;

        $dt = \DateTimeImmutable::createFromFormat('Y-m-d', $dateStr);
        if ($dt !== false) {
            $operationDate = $dt;
        } else {
            $parseStatus = 'ERROR';
            $parseError  = "Nieprawidłowy format daty: {$dateStr}";
        }

        if ($amountRaw !== '') {
            $result = $this->parseAmount($amountRaw);
            if ($result === null) {
                $parseStatus = 'ERROR';
                $parseError  = ($parseError ? $parseError . '; ' : '') . "Nieprawidłowa kwota: {$amountRaw}";
            } else {
                [$amountMinor, $currency] = $result;
                if ($currency !== 'PLN') {
                    $parseStatus = 'ERROR';
                    $parseError  = ($parseError ? $parseError . '; ' : '') . "Obsługiwana jest tylko waluta PLN (wykryto: {$currency})";
                }
            }
        }

        return [
            'row' => new ImportRowData(
                lineNo: $lineNo,
                operationDate: $operationDate,
                descriptionRaw: $description ?: null,
                ownAccountLabelRaw: $ownAccountLabelRaw ?: null,
                counterpartyAccountRaw: $counterpartyAccountRaw,
                bankCategoryRaw: $bankCategory ?: null,
                amountRaw: $amountRaw ?: null,
                amountMinor: $amountMinor,
                parseStatus: $parseStatus,
                parseError: $parseError,
            ),
            'fatalError' => null,
        ];
    }

    /** @return array{0: string, 1: bool} resolved path and whether it is a temp file */
    private function resolveUtf8FilePath(string $filePath): array
    {
        $sample = file_get_contents($filePath, false, null, 0, 131072);
        if ($sample === false) {
            return [$filePath, false];
        }

        $encoding = mb_detect_encoding($sample, ['UTF-8', 'ISO-8859-2', 'Windows-1252'], true);

        if ($encoding === false || $encoding === 'UTF-8') {
            return [$filePath, false];
        }

        try {
            $converted = mb_convert_encoding(file_get_contents($filePath), 'UTF-8', $encoding);
            if ($converted === false) {
                return [$filePath, false];
            }

            $tmp = tempnam(sys_get_temp_dir(), 'csv_import_');
            if ($tmp === false) {
                return [$filePath, false];
            }

            file_put_contents($tmp, $converted);

            return [$tmp, true];
        } catch (\ValueError) {
            return [$filePath, false];
        }
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

    /** @param list<string> $cols */
    private function normalizeDataColumns(array $cols): array
    {
        while ($cols !== [] && ($cols[array_key_last($cols)] ?? '') === '') {
            array_pop($cols);
        }

        return $cols;
    }

    private function startsWithMarker(array $cols, string $marker): bool
    {
        $first       = ltrim($cols[0] ?? '', '#');
        $first       = rtrim($first, ':');
        $checkMarker = ltrim($marker, '#');
        $checkMarker = rtrim($checkMarker, ':');
        return mb_strtolower(trim($first)) === mb_strtolower(trim($checkMarker));
    }

    private function parseDate(string $raw): ?\DateTimeImmutable
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

    /** @return array{int, string}|null */
    private function parseAmount(string $raw): ?array
    {
        $currency = 'PLN';
        if (preg_match('/([A-Z]{3})\s*$/', $raw, $m)) {
            $currency = $m[1];
            $raw      = trim(substr($raw, 0, -strlen($m[0])));
        }

        $raw = preg_replace('/\s/', '', $raw);
        $raw = str_replace(',', '.', $raw);

        if (!is_numeric($raw)) {
            return null;
        }

        $float       = (float)$raw;
        $amountMinor = (int)round($float * 100);

        return [$amountMinor, $currency];
    }
}
