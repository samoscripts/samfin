<?php

declare(strict_types=1);

/**
 * Guard for readable foreign key names in Doctrine migrations.
 *
 * Pełna konwencja (plik migracji + FK): docs/database.md#reguły-nazewnictwa-migracji
 *
 * To avoid breaking historical migrations, validation is enforced only for
 * migration versions >= ENFORCE_FROM_VERSION.
 */

const ENFORCE_FROM_VERSION = 20260607204500;

$migrationsDir = __DIR__ . '/../migrations';
$files = glob($migrationsDir . '/Version*.php');

if ($files === false) {
    fwrite(STDERR, "Could not read migrations directory.\n");
    exit(1);
}

sort($files);

$errors = [];

foreach ($files as $file) {
    if (!preg_match('/Version(\d+)\.php$/', basename($file), $m)) {
        continue;
    }

    $version = (int)$m[1];
    if ($version < ENFORCE_FROM_VERSION) {
        continue;
    }

    $content = file_get_contents($file);
    if ($content === false) {
        $errors[] = basename($file) . ': could not read file.';
        continue;
    }

    $upContent = $content;
    if (preg_match('/function\s+up\s*\([^)]*\)\s*:\s*void\s*\{(.*)\}\s*public\s+function\s+down\s*\(/is', $content, $methodMatch)) {
        $upContent = $methodMatch[1];
    }

    if (!preg_match_all('/ADD\s+CONSTRAINT\s+([A-Za-z0-9_]+)\s+FOREIGN\s+KEY/i', $upContent, $matches, PREG_OFFSET_CAPTURE)) {
        continue;
    }

    foreach ($matches[1] as [$constraintName, $offset]) {
        if (!preg_match('/^fk_[a-z0-9_]+$/', $constraintName)) {
            $line = substr_count(substr($upContent, 0, (int)$offset), "\n") + 1;
            $errors[] = sprintf(
                '%s:up():%d invalid FK name "%s". Use convention: fk_{table}_{column}',
                basename($file),
                $line,
                $constraintName
            );
        }
    }
}

if ($errors !== []) {
    fwrite(STDERR, "Foreign key naming check failed:\n");
    foreach ($errors as $error) {
        fwrite(STDERR, " - {$error}\n");
    }
    exit(1);
}

fwrite(STDOUT, "Foreign key naming check passed.\n");
exit(0);

