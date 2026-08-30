# KmerHosting SDK

Official, server-side SDKs for the KmerHosting API v1.

| Language | Package | Install |
| --- | --- | --- |
| TypeScript | `@kmerhosting/sdk` | npm |
| Python | `kmerhosting-sdk` | pip |
| PHP | `kmerhosting/sdk` | Composer |
| Java | `com.kmerhosting:kmerhosting-sdk` | Maven |

All clients read `KMERHOSTING_API_KEY` by default. Keep the key on your server, never in browser code, mobile apps, repositories, or logs.

```ts
import { KmerHostingClient } from "@kmerhosting/sdk";

const client = new KmerHostingClient();
const services = await client.services.list();
```

```python
from kmerhosting import KmerHostingClient

services = KmerHostingClient().services.list()
```

```php
use KmerHosting\Client;

$services = (new Client())->services()->all();
```

```java
var services = new KmerHostingClient().services().list();
```

Every mutation accepts an optional idempotency key. Supply a stable key when retrying the same business operation; otherwise the SDK generates one.

The API contract is committed at [openapi/openapi.json](openapi/openapi.json) and is served at `https://api.kmerhosting.com/openapi.json` after the API is deployed.

## Publishing

The source is public here first. Registry publication is intentionally separate: it needs ownership and trusted publishing configuration for npm, PyPI, Packagist and Maven Central. Do not add long-lived registry tokens to this repository. Once each registry release exists, use `npm install @kmerhosting/sdk`, `pip install kmerhosting-sdk`, `composer require kmerhosting/sdk`, or the Maven coordinate above.

## License

Apache-2.0. KmerHosting trademarks are not granted by the license.
