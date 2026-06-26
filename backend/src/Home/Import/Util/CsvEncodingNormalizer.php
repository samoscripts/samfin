<?php

namespace App\Home\Import\Util;

/**
 * Normalizes bank CSV files to UTF-8.
 * Polish mBank exports typically use Windows-1250 (CP1250), not UTF-8.
 */
final class CsvEncodingNormalizer
{
    /** @var list<string> */
    private const SOURCE_ENCODINGS = ['CP1250', 'Windows-1250', 'ISO-8859-2', 'Windows-1252'];

    private function convertFrom(string $content, string $encoding): ?string
    {
        if (function_exists('iconv')) {
            $converted = @iconv($encoding, 'UTF-8//IGNORE', $content);
            if ($converted !== false && $converted !== '') {
                return $converted;
            }
        }

        try {
            $converted = mb_convert_encoding($content, 'UTF-8', $encoding);
        } catch (\ValueError) {
            return null;
        }

        return $converted === false ? null : $converted;
    }

    /** @return array{0: string, 1: bool} path to UTF-8 file, whether caller must unlink temp */
    public function resolveUtf8FilePath(string $filePath): array
    {
        $content = file_get_contents($filePath);
        if ($content === false) {
            return [$filePath, false];
        }

        $utf8 = $this->toUtf8($content);
        if ($utf8 === $content) {
            return [$filePath, false];
        }

        $tmp = tempnam(sys_get_temp_dir(), 'csv_import_');
        if ($tmp === false) {
            return [$filePath, false];
        }

        file_put_contents($tmp, $utf8);

        return [$tmp, true];
    }

    public function toUtf8(string $content): string
    {
        $content = $this->stripUtf8Bom($content);

        if ($this->isCleanUtf8($content)) {
            return $content;
        }

        foreach (self::SOURCE_ENCODINGS as $encoding) {
            $converted = $this->convertFrom($content, $encoding);
            if ($converted !== null && $this->isCleanUtf8($converted) && $this->looksLikeBankCsv($converted)) {
                return $converted;
            }
        }

        foreach (self::SOURCE_ENCODINGS as $encoding) {
            $converted = $this->convertFrom($content, $encoding);
            if ($converted !== null && $this->isCleanUtf8($converted)) {
                return $converted;
            }
        }

        return $content;
    }

    private function isCleanUtf8(string $content): bool
    {
        if (!mb_check_encoding($content, 'UTF-8')) {
            return false;
        }

        // Raw CP1250 bytes (e.g. 0x8C = Ś) passed through as UTF-8 become C1 control chars (U+0080–U+009F).
        return !preg_match('/[\x{0080}-\x{009F}]/u', $content);
    }

    private function looksLikeBankCsv(string $content): bool
    {
        return str_contains($content, '#Klient')
            || str_contains($content, '#Data operacji')
            || str_contains($content, '#Data księgowania')
            || str_contains($content, 'PRZELEW')
            || str_contains($content, 'BLIK');
    }

    private function stripUtf8Bom(string $content): string
    {
        if (str_starts_with($content, "\xEF\xBB\xBF")) {
            return substr($content, 3);
        }

        return $content;
    }
}
