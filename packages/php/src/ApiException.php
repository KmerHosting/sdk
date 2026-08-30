<?php

declare(strict_types=1);

namespace KmerHosting;

use RuntimeException;

final class ApiException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly int $status,
        public readonly string $apiCode,
        public readonly ?string $requestId = null,
        public readonly mixed $body = null,
    ) {
        parent::__construct($message, $status);
    }
}
