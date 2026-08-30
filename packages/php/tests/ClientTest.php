<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/ApiException.php';
require_once __DIR__ . '/../src/Client.php';

use KmerHosting\Client;

putenv('KMERHOSTING_API_KEY=kh_live_test');
$client = new Client();
assert($client instanceof Client);
echo "Client initialization passed\n";
