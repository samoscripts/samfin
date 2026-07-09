<?php

namespace App\Home\Configuration\General\Command;

use App\Home\Configuration\General\Service\CategoryPickEventService;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:purge-category-pick-events',
    description: 'Usuwa zdarzenia wyboru kategorii starsze niż okno statystyk (90 dni).',
)]
class PurgeCategoryPickEventsCommand extends Command
{
    public function __construct(
        private CategoryPickEventService $service,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $deleted = $this->service->purgeExpired();
        $io->success(sprintf('Usunięto %d zdarzeń wyboru kategorii.', $deleted));

        return Command::SUCCESS;
    }
}
