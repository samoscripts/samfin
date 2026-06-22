<?php

namespace App\Shared\DTO;

use Symfony\Component\HttpFoundation\InputBag;

final class QueryParams
{
    private const DATE_PATTERN = '/^\d{4}-\d{2}-\d{2}$/';

    public static function nullableString(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return (string) $value;
    }

    /** @return array{dateFrom: string, dateTo: string}|QueryValidationErrors */
    public static function expandMonth(string $month): array|QueryValidationErrors
    {
        if (!preg_match('/^(\d{4})-(\d{2})$/', trim($month), $matches)) {
            return new QueryValidationErrors(['month' => 'Oczekiwany format YYYY-MM.']);
        }

        $year  = (int) $matches[1];
        $mon   = (int) $matches[2];

        if ($mon < 1 || $mon > 12) {
            return new QueryValidationErrors(['month' => 'Miesiąc musi być w zakresie 1–12.']);
        }

        $lastDay = (int) (new \DateTimeImmutable(sprintf('%04d-%02d-01', $year, $mon)))->format('t');

        return [
            'dateFrom' => sprintf('%04d-%02d-01', $year, $mon),
            'dateTo'   => sprintf('%04d-%02d-%02d', $year, $mon, $lastDay),
        ];
    }

  /** @return string|QueryValidationErrors|null */
    public static function optionalDate(mixed $value, string $field): string|QueryValidationErrors|null
    {
        if ($value === null || $value === '') {
            return null;
        }

        $str = (string) $value;
        if (!preg_match(self::DATE_PATTERN, $str)) {
            return new QueryValidationErrors([$field => 'Oczekiwany format YYYY-MM-DD.']);
        }

        $parts = explode('-', $str);
        if (!checkdate((int) $parts[1], (int) $parts[2], (int) $parts[0])) {
            return new QueryValidationErrors([$field => 'Nieprawidłowa data.']);
        }

        return $str;
    }

    /**
     * @return int|QueryValidationErrors
     */
    public static function positiveInt(
        mixed $value,
        string $field,
        int $default,
        int $min = 1,
        ?int $max = null,
        bool $allowDefaultWhenMissing = true,
    ): int|QueryValidationErrors {
        if ($value === null || $value === '') {
            return $allowDefaultWhenMissing ? $default : new QueryValidationErrors([$field => 'Pole jest wymagane.']);
        }

        if (!is_numeric($value)) {
            return new QueryValidationErrors([$field => 'Oczekiwana dodatnia liczba całkowita.']);
        }

        $int = (int) $value;
        if ($int < $min) {
            return new QueryValidationErrors([$field => sprintf('Wartość musi być >= %d.', $min)]);
        }

        if ($max !== null && $int > $max) {
            return new QueryValidationErrors([$field => sprintf('Wartość musi być <= %d.', $max)]);
        }

        return $int;
    }

    /**
     * `perPage` takes precedence; `limit` is a deprecated alias.
     *
     * @return int|QueryValidationErrors
     */
    public static function perPage(InputBag $query, int $default, int $max): int|QueryValidationErrors
    {
        $raw = $query->has('perPage')
            ? $query->get('perPage')
            : ($query->has('limit') ? $query->get('limit') : null);

        return self::positiveInt($raw, 'perPage', $default, 1, $max);
    }

    /**
     * @param list<string> $allowed
     * @return string|QueryValidationErrors|null
     */
    public static function optionalEnum(mixed $value, string $field, array $allowed): string|QueryValidationErrors|null
    {
        if ($value === null || $value === '') {
            return null;
        }

        $str = (string) $value;
        if (!in_array($str, $allowed, true)) {
            return new QueryValidationErrors([$field => 'Niedozwolona wartość.']);
        }

        return $str;
    }

    /**
     * @param list<string> $allowed
     * @return string|QueryValidationErrors
     */
    public static function enumWithDefault(
        mixed $value,
        string $field,
        array $allowed,
        string $default,
    ): string|QueryValidationErrors {
        if ($value === null || $value === '') {
            return $default;
        }

        $str = (string) $value;
        if (!in_array($str, $allowed, true)) {
            return new QueryValidationErrors([$field => 'Niedozwolona wartość.']);
        }

        return $str;
    }

    /** @param QueryValidationErrors|mixed $result */
    public static function isError(mixed $result): bool
    {
        return $result instanceof QueryValidationErrors;
    }

    /** @param array<string, string> $errors */
    public static function mergeErrors(array $errors, mixed $result): array
    {
        if ($result instanceof QueryValidationErrors) {
            return array_merge($errors, $result->fields);
        }

        return $errors;
    }
}
