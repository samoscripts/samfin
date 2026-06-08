<?php

namespace App\Home\Import\Repository;

use App\Home\Import\Entity\CsvImportRow;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<CsvImportRow> */
class CsvImportRowRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, CsvImportRow::class);
    }
}
