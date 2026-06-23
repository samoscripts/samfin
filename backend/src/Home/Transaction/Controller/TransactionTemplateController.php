<?php

namespace App\Home\Transaction\Controller;

use App\Home\Configuration\Entity\Category;
use App\Home\Configuration\Entity\Concern;
use App\Home\Configuration\Entity\Party;
use App\Home\Configuration\Entity\Wallet;
use App\Home\Configuration\Repository\CategoryRepository;
use App\Home\Configuration\Repository\ConcernRepository;
use App\Home\Configuration\Repository\PartyRepository;
use App\Home\Configuration\Repository\WalletRepository;
use App\Home\Transaction\Entity\Transaction;
use App\Home\Transaction\Entity\TransactionTemplate;
use App\Home\Transaction\Repository\TransactionTemplateRepository;
use App\Identity\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/transaction-templates')]
class TransactionTemplateController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface       $em,
        private TransactionTemplateRepository $repository,
        private PartyRepository              $partyRepository,
        private WalletRepository             $walletRepository,
        private ConcernRepository            $concernRepository,
        private CategoryRepository           $categoryRepository,
        private Security                     $security,
    ) {}

    #[Route('', name: 'api_transaction_templates_index', methods: ['GET'])]
    public function index(Request $request): JsonResponse
    {
        $direction = (string) $request->query->get('direction', '');
        if (!$this->isValidDirection($direction)) {
            return $this->json(['message' => 'Parametr direction jest wymagany i musi być INCOME lub EXPENSE.'], 422);
        }

        /** @var User $user */
        $user = $this->security->getUser();

        return $this->json(array_map(
            fn (TransactionTemplate $t) => $t->toApiArray(),
            $this->repository->findByUserAndDirection($user, $direction),
        ));
    }

    #[Route('', name: 'api_transaction_templates_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];

        $name = trim((string) ($data['name'] ?? ''));
        if ($name === '') {
            return $this->json(['message' => 'Pole nazwa jest wymagane.'], 422);
        }

        $direction = (string) ($data['direction'] ?? '');
        if (!$this->isValidDirection($direction)) {
            return $this->json(['message' => 'Pole direction jest wymagane i musi być INCOME lub EXPENSE.'], 422);
        }

        /** @var User $user */
        $user = $this->security->getUser();

        if ($this->repository->findOneByUserDirectionAndName($user, $direction, $name) !== null) {
            return $this->json(['message' => 'Szablon o tej nazwie już istnieje dla tego kierunku.'], 422);
        }

        $paidFromPartyId = $this->nullableInt($data['paidFromPartyId'] ?? null);
        $paidToPartyId   = $this->nullableInt($data['paidToPartyId'] ?? null);
        $walletId        = $this->nullableInt($data['walletId'] ?? null);
        $concernId       = $this->nullableInt($data['concernId'] ?? null);
        $categoryId      = $this->nullableInt($data['categoryId'] ?? null);

        if ($err = $this->resolveParty($paidFromPartyId)) {
            return $this->json(['message' => $err], 422);
        }
        if ($err = $this->resolveParty($paidToPartyId)) {
            return $this->json(['message' => $err], 422);
        }
        if ($err = $this->resolveWallet($walletId)) {
            return $this->json(['message' => $err], 422);
        }
        if ($err = $this->resolveConcern($concernId)) {
            return $this->json(['message' => $err], 422);
        }
        if ($err = $this->resolveCategory($categoryId, $direction)) {
            return $this->json(['message' => $err], 422);
        }

        $template = new TransactionTemplate();
        $template->setUser($user);
        $template->setName($name);
        $template->setDirection($direction);
        $template->setPaidFromParty($paidFromPartyId !== null ? $this->partyRepository->find($paidFromPartyId) : null);
        $template->setPaidToParty($paidToPartyId !== null ? $this->partyRepository->find($paidToPartyId) : null);
        $template->setWallet($walletId !== null ? $this->walletRepository->find($walletId) : null);
        $template->setConcern($concernId !== null ? $this->concernRepository->find($concernId) : null);
        $template->setCategory($categoryId !== null ? $this->categoryRepository->find($categoryId) : null);

        $this->em->persist($template);
        $this->em->flush();

        return $this->json($template->toApiArray(), 201);
    }

    #[Route('/{id}', name: 'api_transaction_templates_delete', methods: ['DELETE'])]
    public function delete(int $id): JsonResponse
    {
        $template = $this->repository->find($id);
        if (!$template) {
            return $this->json(['message' => 'Nie znaleziono szablonu.'], 404);
        }

        /** @var User $user */
        $user = $this->security->getUser();
        if ($template->getUser()?->getId() !== $user->getId()) {
            return $this->json(['message' => 'Nie znaleziono szablonu.'], 404);
        }

        $this->em->remove($template);
        $this->em->flush();

        return $this->json(null, 204);
    }

    private function isValidDirection(string $direction): bool
    {
        return in_array($direction, [Transaction::DIRECTION_INCOME, Transaction::DIRECTION_EXPENSE], true);
    }

    private function nullableInt(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        return (int) $value;
    }

    private function resolveParty(?int $id): ?string
    {
        if ($id === null) {
            return null;
        }
        $party = $this->partyRepository->find($id);
        if (!$party instanceof Party) {
            return 'Nie znaleziono podmiotu.';
        }

        return null;
    }

    private function resolveWallet(?int $id): ?string
    {
        if ($id === null) {
            return null;
        }
        $wallet = $this->walletRepository->find($id);
        if (!$wallet instanceof Wallet) {
            return 'Nie znaleziono portfela.';
        }

        return null;
    }

    private function resolveConcern(?int $id): ?string
    {
        if ($id === null) {
            return null;
        }
        $concern = $this->concernRepository->find($id);
        if (!$concern instanceof Concern) {
            return 'Nie znaleziono obszaru „dotyczy”.';
        }

        return null;
    }

    private function resolveCategory(?int $id, string $direction): ?string
    {
        if ($id === null) {
            return null;
        }
        $category = $this->categoryRepository->find($id);
        if (!$category instanceof Category) {
            return 'Nie znaleziono kategorii.';
        }
        if (!$category->supportsDirection($direction)) {
            return 'Kategoria nie pasuje do kierunku szablonu.';
        }

        return null;
    }
}
