<?php



namespace App\Home\Transaction\DTO;



use App\Shared\DTO\QueryParams;

use App\Shared\DTO\QueryValidationErrors;

use Symfony\Component\HttpFoundation\InputBag;



final readonly class TransactionListQuery

{

    private const ALLOWED_SORT_FIELDS = ['date', 'amount'];

    private const ALLOWED_SORT_DIRS = ['asc', 'desc'];

    public function __construct(

        public TransactionFilterCriteria $filters,

        public string $sortField = 'date',

        public string $sortDir = 'desc',

        public int $page = 1,

        public int $perPage = 25,

    ) {}



    /** @return self|QueryValidationErrors */

    public static function fromInputBag(InputBag $query): self|QueryValidationErrors

    {

        $errors = [];



        $filterErrors = TransactionFilterCriteria::validateFromInputBag($query);

        $errors = QueryParams::mergeErrors($errors, $filterErrors);



        $sortField = QueryParams::enumWithDefault(

            $query->get('sortField'),

            'sortField',

            self::ALLOWED_SORT_FIELDS,

            'date',

        );

        $errors = QueryParams::mergeErrors($errors, $sortField);



        $sortDir = QueryParams::enumWithDefault(

            $query->has('sortDir') ? strtolower((string) $query->get('sortDir')) : null,

            'sortDir',

            self::ALLOWED_SORT_DIRS,

            'desc',

        );

        $errors = QueryParams::mergeErrors($errors, $sortDir);



        $page = QueryParams::positiveInt($query->get('page'), 'page', 1, 1);

        $errors = QueryParams::mergeErrors($errors, $page);



        $perPage = QueryParams::perPage($query, 25, 100);

        $errors = QueryParams::mergeErrors($errors, $perPage);



        if ($errors !== []) {

            return new QueryValidationErrors($errors);

        }



        $filters = TransactionFilterCriteria::fromInputBag($query);



        return new self($filters, $sortField, $sortDir, $page, $perPage);

    }



    /** @return array<string, mixed> */

    public function toRepositoryFilters(): array

    {

        return $this->filters->toRepositoryFilters();

    }

}


