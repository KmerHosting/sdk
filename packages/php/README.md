# kmerhosting/sdk

```bash
composer require kmerhosting/sdk
```

```php
use KmerHosting\Client;

$client = new Client(); // reads KMERHOSTING_API_KEY
$services = $client->services()->all();
```

Use this package only from trusted server-side PHP code.
