<?php

namespace App\Home\Import\DTO;

enum ImportIngestionMode: string
{
    /** Fail when a CSV row already has a linked transaction. */
    case Strict = 'strict';

    /** Skip rows that already have a transaction; import the rest. */
    case SkipImported = 'skip_imported';

    /** Delete existing transactions for processed rows and create them again. */
    case Reimport = 'reimport';
}
