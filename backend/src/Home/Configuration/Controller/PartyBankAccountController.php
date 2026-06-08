<?php

namespace App\Home\Configuration\Controller;

use App\Home\Configuration\Entity\PartyBankAccount;
use App\Home\Configuration\Repository\PartyBankAccountRepository;
use App\Home\Configuration\Repository\PartyRepository;
use App\Identity\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/party-bank-accounts')]
class PartyBankAccountController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface     $em,
        private PartyBankAccountRepository $accountRepository,
        private PartyRepository            $partyRepository,
        private Security                   $security,
    ) {}

    #[Route('', name: 'api_party_bank_accounts_index', methods: ['GET'])]
    public function index(Request $request): JsonResponse
    {
        $partyId = $request->query->get('partyId');

        if ($partyId !== null) {
            $party = $this->partyRepository->find((int)$partyId);
            if (!$party) {
                return $this->json(['message' => 'Nie znaleziono podmiotu.'], 404);
            }
            $accounts = $this->accountRepository->findBy(['party' => $party], ['displayName' => 'ASC']);
        } else {
            $accounts = $this->accountRepository->findBy([], ['displayName' => 'ASC']);
        }

        return $this->json(array_map(
            fn(PartyBankAccount $a) => $a->toApiArray(),
            $accounts
        ));
    }

    #[Route('/{id}', name: 'api_party_bank_accounts_show', methods: ['GET'])]
    public function show(int $id): JsonResponse
    {
        $account = $this->accountRepository->find($id);
        if (!$account) {
            return $this->json(['message' => 'Nie znaleziono rachunku bankowego.'], 404);
        }
        return $this->json($account->toApiArray());
    }

    #[Route('', name: 'api_party_bank_accounts_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];

        $partyId = (int)($data['partyId'] ?? 0);
        $party = $this->partyRepository->find($partyId);
        if (!$party) {
            return $this->json(['message' => 'Nie znaleziono podmiotu.'], 422);
        }

        $accountNumber = trim((string)($data['accountNumber'] ?? ''));
        if ($accountNumber === '') {
            return $this->json(['message' => 'Numer rachunku jest wymagany.'], 422);
        }

        /** @var User $user */
        $user = $this->security->getUser();

        $account = new PartyBankAccount();
        $account->setParty($party);
        $account->setAccountNumber($accountNumber);
        $account->setBankName(($data['bankName'] ?? '') !== '' ? $data['bankName'] : null);
        $account->setDisplayName(($data['displayName'] ?? '') !== '' ? $data['displayName'] : null);
        $account->setOwnerNameFromBank(($data['ownerNameFromBank'] ?? '') !== '' ? $data['ownerNameFromBank'] : null);
        $account->setCurrency((string)($data['currency'] ?? 'PLN') ?: 'PLN');
        $account->setActive((bool)($data['active'] ?? true));
        $account->setCreatedBy($user);
        $account->setUpdatedBy($user);

        $this->em->persist($account);
        $this->em->flush();

        return $this->json($account->toApiArray(), 201);
    }

    #[Route('/{id}', name: 'api_party_bank_accounts_update', methods: ['PUT'])]
    public function update(int $id, Request $request): JsonResponse
    {
        $account = $this->accountRepository->find($id);
        if (!$account) {
            return $this->json(['message' => 'Nie znaleziono rachunku bankowego.'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        if (array_key_exists('bankName', $data)) {
            $account->setBankName(($data['bankName'] ?? '') !== '' ? $data['bankName'] : null);
        }
        if (array_key_exists('accountNumber', $data)) {
            $accountNumber = trim((string)$data['accountNumber']);
            if ($accountNumber === '') {
                return $this->json(['message' => 'Numer rachunku jest wymagany.'], 422);
            }
            $account->setAccountNumber($accountNumber);
        }
        if (array_key_exists('displayName', $data)) {
            $account->setDisplayName(($data['displayName'] ?? '') !== '' ? $data['displayName'] : null);
        }
        if (array_key_exists('ownerNameFromBank', $data)) {
            $account->setOwnerNameFromBank(($data['ownerNameFromBank'] ?? '') !== '' ? $data['ownerNameFromBank'] : null);
        }
        if (array_key_exists('currency', $data)) {
            $account->setCurrency((string)$data['currency'] ?: 'PLN');
        }
        if (array_key_exists('active', $data)) {
            $account->setActive((bool)$data['active']);
        }

        /** @var User $user */
        $user = $this->security->getUser();
        $account->setUpdatedBy($user);

        $this->em->flush();
        return $this->json($account->toApiArray());
    }

    #[Route('/{id}', name: 'api_party_bank_accounts_delete', methods: ['DELETE'])]
    public function delete(int $id): JsonResponse
    {
        $account = $this->accountRepository->find($id);
        if (!$account) {
            return $this->json(['message' => 'Nie znaleziono rachunku bankowego.'], 404);
        }

        /** @var User $user */
        $user = $this->security->getUser();
        $account->setActive(false);
        $account->setUpdatedBy($user);
        $this->em->flush();

        return $this->json(['message' => 'Rachunek bankowy dezaktywowany.']);
    }
}
