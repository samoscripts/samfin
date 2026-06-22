<?php



namespace App\Home\Transaction\DTO;



use App\Shared\DTO\QueryParams;

use App\Shared\DTO\QueryValidationErrors;

use Symfony\Component\HttpFoundation\InputBag;



final readonly class TransactionFilterCriteria

{

    private const ALLOWED_DIRECTIONS = ['EXPENSE', 'INCOME'];

    private const ALLOWED_STATUSES = ['UNCLASSIFIED', 'PARTIALLY_CLASSIFIED', 'CLASSIFIED'];



    public function __construct(

        public ?string $dateFrom = null,

        public ?string $dateTo = null,

        public ?string $direction = null,

        public ?string $status = null,

        public ?string $paidFromPartyId = null,

        public ?string $paidToPartyId = null,

        public ?string $walletId = null,

        public ?string $concernId = null,

        public ?string $categoryId = null,

        public ?string $amountMin = null,

        public ?string $amountMax = null,

        public ?string $description = null,

    ) {}



    public static function fromInputBag(InputBag $query): self

    {

        $monthRange = [];

        $monthRaw   = QueryParams::nullableString($query->get('month'));

        if ($monthRaw !== null) {

            $expanded = QueryParams::expandMonth($monthRaw);

            if (!($expanded instanceof QueryValidationErrors)) {

                $monthRange = $expanded;

            }

        }



        return new self(

            dateFrom: self::nullableString($query->get('dateFrom')) ?? ($monthRange['dateFrom'] ?? null),

            dateTo: self::nullableString($query->get('dateTo')) ?? ($monthRange['dateTo'] ?? null),

            direction: self::nullableString($query->get('direction')),

            status: self::nullableString($query->get('status')),

            paidFromPartyId: self::nullableString($query->get('paidFromPartyId')),

            paidToPartyId: self::nullableString($query->get('paidToPartyId')),

            walletId: self::nullableString($query->get('walletId')),

            concernId: self::nullableString($query->get('concernId')),

            categoryId: self::nullableString($query->get('categoryId')),

            amountMin: self::nullableString($query->get('amountMin')),

            amountMax: self::nullableString($query->get('amountMax')),

            description: self::nullableString($query->get('description')),

        );

    }



    /** @return QueryValidationErrors|true */

    public static function validateFromInputBag(InputBag $query): QueryValidationErrors|true

    {

        $errors = [];



        $monthRaw = QueryParams::nullableString($query->get('month'));

        if ($monthRaw !== null) {

            $expanded = QueryParams::expandMonth($monthRaw);

            $errors = QueryParams::mergeErrors($errors, $expanded);

        }



        if ($query->has('dateFrom')) {

            $parsed = QueryParams::optionalDate($query->get('dateFrom'), 'dateFrom');

            $errors = QueryParams::mergeErrors($errors, $parsed);

        }



        if ($query->has('dateTo')) {

            $parsed = QueryParams::optionalDate($query->get('dateTo'), 'dateTo');

            $errors = QueryParams::mergeErrors($errors, $parsed);

        }



        if ($query->has('direction')) {

            foreach (self::splitCommaList($query->get('direction')) as $token) {

                if (!in_array($token, self::ALLOWED_DIRECTIONS, true)) {

                    $errors['direction'] = 'Niedozwolona wartość kierunku.';

                    break;

                }

            }

        }



        if ($query->has('status')) {

            foreach (self::splitCommaList($query->get('status')) as $token) {

                if (!in_array($token, self::ALLOWED_STATUSES, true)) {

                    $errors['status'] = 'Niedozwolona wartość statusu.';

                    break;

                }

            }

        }



        foreach (['paidFromPartyId', 'paidToPartyId', 'walletId', 'concernId', 'categoryId'] as $field) {

            if (!$query->has($field)) {

                continue;

            }

            $raw = $query->get($field);

            if ($raw === null || $raw === '') {

                continue;

            }

            $parsed = QueryParams::positiveInt($raw, $field, 0, 1);

            if ($parsed instanceof QueryValidationErrors) {

                $errors = QueryParams::mergeErrors($errors, $parsed);

            }

        }



        if ($errors !== []) {

            return new QueryValidationErrors($errors);

        }



        return true;

    }



    /** @param array<string, mixed> $data */

    public static function fromArray(array $data): self

    {

        return new self(

            dateFrom: self::nullableString($data['dateFrom'] ?? null),

            dateTo: self::nullableString($data['dateTo'] ?? null),

            direction: self::nullableString($data['direction'] ?? null),

            status: self::nullableString($data['status'] ?? null),

            paidFromPartyId: self::nullableString($data['paidFromPartyId'] ?? null),

            paidToPartyId: self::nullableString($data['paidToPartyId'] ?? null),

            walletId: self::nullableString($data['walletId'] ?? null),

            concernId: self::nullableString($data['concernId'] ?? null),

            categoryId: self::nullableString($data['categoryId'] ?? null),

            amountMin: self::nullableString($data['amountMin'] ?? null),

            amountMax: self::nullableString($data['amountMax'] ?? null),

            description: self::nullableString($data['description'] ?? null),

        );

    }



    /** @return array<string, mixed> */

    public function toRepositoryFilters(): array

    {

        return array_filter([

            'dateFrom'        => $this->dateFrom,

            'dateTo'          => $this->dateTo,

            'direction'       => $this->direction,

            'status'          => $this->status,

            'paidFromPartyId' => $this->paidFromPartyId,

            'paidToPartyId'   => $this->paidToPartyId,

            'walletId'        => $this->walletId,

            'concernId'       => $this->concernId,

            'categoryId'      => $this->categoryId,

            'amountMin'       => $this->amountMin,

            'amountMax'       => $this->amountMax,

            'description'     => $this->description,

        ], static fn (mixed $v) => $v !== null && $v !== '');

    }



    private static function nullableString(mixed $value): ?string

    {

        return QueryParams::nullableString($value);

    }



    /** @return list<string> */

    private static function splitCommaList(mixed $value): array

    {

        if ($value === null || $value === '') {

            return [];

        }



        return array_values(array_filter(array_map('trim', explode(',', (string) $value))));

    }

}


