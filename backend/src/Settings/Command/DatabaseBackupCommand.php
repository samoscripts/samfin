<?php

namespace App\Settings\Command;

use App\Settings\Exception\DatabaseBackupException;
use App\Settings\Service\DatabaseBackupService;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:database:backup',
    description: 'Tworzy kopię zapasową bazy danych (ZIP z SQL i manifestem) w var/backups/.',
)]
class DatabaseBackupCommand extends Command
{
    public function __construct(
        private readonly DatabaseBackupService $backupService,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        try {
            $entry = $this->backupService->createBackup();
        } catch (DatabaseBackupException $e) {
            $io->error($e->getMessage());

            return Command::FAILURE;
        }

        $io->success('Kopia zapasowa utworzona.');
        $io->listing([
            'ID:       ' . ($entry['id'] ?? ''),
            'Plik:     ' . ($entry['filename'] ?? ''),
            'Rozmiar:  ' . number_format((int) ($entry['sizeBytes'] ?? 0)) . ' B',
            'Schemat:  ' . ($entry['schemaVersion'] ?? ''),
        ]);

        return Command::SUCCESS;
    }
}
