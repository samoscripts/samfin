<?php

namespace App\Home\Import\Provider;

use App\Home\Import\DTO\ImportErrorData;
use App\Home\Import\DTO\ImportResult;
use App\Home\Import\DTO\ImportRowData;
use Symfony\Component\DependencyInjection\Attribute\AutoconfigureTag;

#[AutoconfigureTag('app.bank_import_provider')]
class MbankCsvImportProvider implements BankImportProviderInterface
{
    public function getCode(): string { return 'MBANK'; }

    public function getDisplayName(): string { return 'mBank S.A.'; }

    public function parse(string $csvContent): ImportResult
    {
        $errors = [];

        // --- 1. Encoding normalization ---
        $encodingError = null;
        try {
            $encoding = mb_detect_encoding($csvContent, ['UTF-8', 'ISO-8859-2', 'Windows-1252'], true);
            if ($encoding !== false && $encoding !== 'UTF-8') {
                $converted = mb_convert_encoding($csvContent, 'UTF-8', $encoding);
                if ($converted !== false) {
                    $csvContent = $converted;
                }
            } elseif ($encoding === false) {
                $encodingError = 'Nie udało się wykryć kodowania pliku. Plik może zawierać znaki spoza UTF-8.';
            }
        } catch (\ValueError $e) {
            $encodingError = 'Błąd konwersji kodowania: ' . $e->getMessage();
        }

        if ($encodingError !== null) {
            $errors[] = new ImportErrorData(
                scope: 'HEADER',
                code: 'ENCODING_ERROR',
                message: $encodingError,
                fatal: false,
            );
        }

        // --- 2. Normalize line endings ---
        $csvContent = str_replace(["\r\n", "\r"], "\n", $csvContent);
        $lines = explode("\n", $csvContent);

        // --- 3. Parse header metadata ---
        $detectedClientName     = null;
        $detectedAccountNumber  = null;
        $detectedAccountDisplay = null;
        $periodFrom             = null;
        $periodTo               = null;
        $accounts               = [];
        $detectedCurrency       = null;
        $dataStartLine          = null;

        for ($i = 0; $i < count($lines); $i++) {
            $line = $lines[$i];
            $cols = $this->parseCsvLine($line);

            if ($this->startsWithMarker($cols, '#Klient')) {
                $next = isset($lines[$i + 1]) ? $this->parseCsvLine($lines[$i + 1]) : [];
                $raw  = $next[0] ?? '';
                $detectedClientName = $this->normalizeClientName($raw);
                $i++;
                continue;
            }

            if ($this->startsWithMarker($cols, '#Za okres:')) {
                $nextLine  = isset($lines[$i + 1]) ? trim($lines[$i + 1]) : '';
                $nextCols  = $this->parseCsvLine($nextLine);

                $candidate1 = trim($nextCols[0] ?? '');
                $candidate2 = trim($nextCols[1] ?? '');

                if ($candidate1 !== '' && $candidate2 !== '') {
                    $periodFrom = $this->parseDate($candidate1);
                    $periodTo   = $this->parseDate($candidate2);
                    $i++;
                } elseif ($candidate1 !== '') {
                    $line2 = isset($lines[$i + 2]) ? trim($lines[$i + 2]) : '';
                    $periodFrom = $this->parseDate($candidate1);
                    $periodTo   = $this->parseDate($line2);
                    $i += 2;
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
                $j = $i + 1;
                while ($j < count($lines)) {
                    $nextLine = trim($lines[$j]);
                    if ($nextLine === '' || str_starts_with($nextLine, '#')) {
                        break;
                    }
                    $nextCols   = $this->parseCsvLine($nextLine);
                    $rawAccount = trim($nextCols[0] ?? '');
                    if ($rawAccount !== '') {
                        $accounts[] = $rawAccount;
                    }
                    $j++;
                }
                $i = $j - 1;
                continue;
            }

            if ($this->startsWithMarker($cols, '#Waluta')) {
                $next     = isset($lines[$i + 1]) ? $this->parseCsvLine($lines[$i + 1]) : [];
                $currency = trim($next[0] ?? '');
                if ($currency !== '') {
                    $detectedCurrency = $currency;
                }
                $i++;
                continue;
            }

            if ($this->startsWithMarker($cols, '#Data operacji')) {
                $dataStartLine = $i + 1;
                break;
            }
        }

        // --- 4. Validate header currency ---
        if ($detectedCurrency !== null && $detectedCurrency !== 'PLN') {
            $errors[] = new ImportErrorData(
                scope: 'HEADER',
                code: 'UNSUPPORTED_CURRENCY',
                message: "Obsługiwana jest tylko waluta PLN w nagłówku #Waluta (wykryto: {$detectedCurrency}).",
                fatal: true,
            );
        }

        // --- 5. Validate account count ---
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

        // --- 6. Validate that data section was found ---
        if ($dataStartLine === null) {
            $errors[] = new ImportErrorData(
                scope: 'HEADER',
                code: 'DATA_SECTION_NOT_FOUND',
                message: 'Nie znaleziono sekcji danych (#Data operacji) w pliku CSV. Nieobsługiwany format.',
                fatal: true,
            );
        }

        // --- 7. Parse data rows ---
        $rows = [];
        $hasFatalHeaderError = array_reduce(
            $errors,
            fn(bool $carry, ImportErrorData $e) => $carry || $e->fatal,
            false,
        );

        if ($dataStartLine !== null && !$hasFatalHeaderError) {
            for ($i = $dataStartLine; $i < count($lines); $i++) {
                $rawLine = $lines[$i];
                $line    = trim($rawLine);

                if ($line === '') {
                    continue;
                }

                $cols = $this->parseCsvLine($line);

                if (count($cols) < 5) {
                    $rows[] = new ImportRowData(
                        lineNo: $i + 1,
                        operationDate: null,
                        descriptionRaw: $rawLine ?: null,
                        accountRaw: null,
                        bankCategoryRaw: null,
                        amountRaw: null,
                        amountMinor: null,
                        parseStatus: 'ERROR',
                        parseError: 'Za mało kolumn (' . count($cols) . '/5) — linia pominięta.',
                    );
                    continue;
                }

                $dateStr      = trim($cols[0]);
                $description  = trim($cols[1]);
                $accountRaw   = trim($cols[2]);
                $bankCategory = trim($cols[3]);
                $amountRaw    = trim($cols[4]);

                if ($dateStr === '') {
                    $rows[] = new ImportRowData(
                        lineNo: $i + 1,
                        operationDate: null,
                        descriptionRaw: $description ?: null,
                        accountRaw: $accountRaw ?: null,
                        bankCategoryRaw: $bankCategory ?: null,
                        amountRaw: $amountRaw ?: null,
                        amountMinor: null,
                        parseStatus: 'ERROR',
                        parseError: 'Brak daty operacji — linia pominięta.',
                    );
                    continue;
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

                $rows[] = new ImportRowData(
                    lineNo: $i + 1,
                    operationDate: $operationDate,
                    descriptionRaw: $description ?: null,
                    accountRaw: $accountRaw ?: null,
                    bankCategoryRaw: $bankCategory ?: null,
                    amountRaw: $amountRaw ?: null,
                    amountMinor: $amountMinor,
                    parseStatus: $parseStatus,
                    parseError: $parseError,
                );
            }
        }

        $headerValid = !$hasFatalHeaderError;

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
