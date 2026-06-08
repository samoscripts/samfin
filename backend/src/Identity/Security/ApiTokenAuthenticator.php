<?php

namespace App\Identity\Security;

use App\Identity\Repository\UserRepository;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Core\Exception\CustomUserMessageAuthenticationException;
use Symfony\Component\Security\Http\Authenticator\AbstractAuthenticator;
use Symfony\Component\Security\Http\Authenticator\Passport\Badge\UserBadge;
use Symfony\Component\Security\Http\Authenticator\Passport\Passport;
use Symfony\Component\Security\Http\Authenticator\Passport\SelfValidatingPassport;

class ApiTokenAuthenticator extends AbstractAuthenticator
{
    public function __construct(private UserRepository $userRepository) {}

    public function supports(Request $request): ?bool
    {
        $auth = $request->headers->get('Authorization', '');
        return str_starts_with($auth, 'Bearer ');
    }

    public function authenticate(Request $request): Passport
    {
        $auth  = $request->headers->get('Authorization', '');
        $token = substr($auth, 7);

        if (empty(trim($token))) {
            throw new CustomUserMessageAuthenticationException('Brak tokenu autoryzacji.');
        }

        return new SelfValidatingPassport(
            new UserBadge($token, function (string $token) {
                $user = $this->userRepository->findOneBy(['apiToken' => $token]);

                if (!$user) {
                    throw new CustomUserMessageAuthenticationException('Nieprawidłowy token autoryzacji.');
                }
                if (!$user->isActive()) {
                    throw new CustomUserMessageAuthenticationException('Konto jest nieaktywne.');
                }

                return $user;
            })
        );
    }

    public function onAuthenticationSuccess(Request $request, TokenInterface $token, string $firewallName): ?Response
    {
        return null;
    }

    public function onAuthenticationFailure(Request $request, AuthenticationException $exception): ?Response
    {
        return new JsonResponse(
            ['message' => strtr($exception->getMessageKey(), $exception->getMessageData())],
            Response::HTTP_UNAUTHORIZED
        );
    }
}
