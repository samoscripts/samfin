<?php

namespace App\Home\Import\Repository;

use App\Home\Import\Entity\CsvImportError;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<CsvImportError> */
class CsvImportErrorRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, CsvImportError::class);
    }
}
