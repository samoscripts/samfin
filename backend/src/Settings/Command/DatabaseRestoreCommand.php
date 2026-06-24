<?php

namespace App\Settings\Command;

use App\Settings\Exception\DatabaseBackupException;
use App\Settings\Service\DatabaseBackupService;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Question\ConfirmationQuestion;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:database:restore',
    description: 'Przywraca bazę danych z pliku ZIP (awaryjnie, bez HTTP).',
)]
class DatabaseRestoreCommand extends Command
{
    public function __construct(
        private readonly DatabaseBackupService $backupService,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addArgument('path', InputArgument::REQUIRED, 'Ścieżka do pliku .zip')
            ->addOption('force', null, InputOption::VALUE_NONE, 'Pomiń walidację version/schemaVersion')
            ->addOption('skip-pre-backup', null, InputOption::VALUE_NONE, 'Pomiń automatyczną kopię przed przywróceniem');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $path = (string) $input->getArgument('path');
        $force = (bool) $input->getOption('force');
        $skipPreBackup = (bool) $input->getOption('skip-pre-backup');

        if (!$input->getOption('no-interaction')) {
            $question = new ConfirmationQuestion(
                sprintf('Przywrócić bazę z pliku "%s"? Operacja nadpisze całą bazę. [y/N] ', $path),
                false,
            );

            if (!$io->askQuestion($question)) {
                $io->warning('Anulowano.');

                return Command::SUCCESS;
            }
        }

        try {
            $result = $this->backupService->restoreFromLocalZip($path, $force, $skipPreBackup);
        } catch (DatabaseBackupException $e) {
            $io->error($e->getMessage());
            if ($e->getContext() !== []) {
                $io->writeln(json_encode($e->getContext(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            }

            return Command::FAILURE;
        }

        $io->success('Baza przywrócona pomyślnie.');
        $manifest = $result['manifest'] ?? [];
        if ($manifest !== []) {
            $io->writeln(json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        }

        return Command::SUCCESS;
    }
}
