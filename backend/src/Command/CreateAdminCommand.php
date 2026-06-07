<?php

namespace App\Command;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

#[AsCommand(
    name: 'app:create-admin',
    description: 'Tworzy pierwszego użytkownika administratora (admin@samfin.local / admin).',
)]
class CreateAdminCommand extends Command
{
    public function __construct(
        private EntityManagerInterface      $em,
        private UserRepository              $userRepository,
        private UserPasswordHasherInterface $passwordHasher,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $email = 'admin@samfin.local';

        if ($this->userRepository->findOneBy(['email' => $email])) {
            $output->writeln('<comment>Administrator już istnieje: ' . $email . '</comment>');
            return Command::SUCCESS;
        }

        $user = new User();
        $user->setEmail($email);
        $user->setForename('Administrator');
        $user->setSurname('');
        $user->setDisplayName('Administrator');
        $user->setRole(User::ROLE_ADMIN);
        $user->setAvatarSprite('funny-avatars-01');
        $user->setAvatarIndex(0);
        $user->setActive(true);
        $user->setPasswordHash($this->passwordHasher->hashPassword($user, 'admin'));

        $this->em->persist($user);
        $this->em->flush();

        $output->writeln('<info>Administrator utworzony pomyślnie.</info>');
        $output->writeln('  Email:  ' . $email);
        $output->writeln('  Hasło:  admin');
        $output->writeln('<comment>Zmień hasło po pierwszym logowaniu!</comment>');

        return Command::SUCCESS;
    }
}
