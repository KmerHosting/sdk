# Official KmerHosting SDK

Official server-side SDKs for the KmerHosting API.

[![Verify SDKs](https://github.com/KmerHosting/sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/KmerHosting/sdk/actions/workflows/ci.yml)
[![API documentation](https://img.shields.io/badge/API-Swagger-85ea2d)](https://api.kmerhosting.com/docs)

## 📦 Install

### TypeScript

```bash
npm install @kmerhosting/sdk
```

### Python

```bash
pip install kmerhosting-sdk
```

### PHP

```bash
composer require kmerhosting/sdk
```

### Java

Add this dependency to `pom.xml`:

```xml
<dependency>
  <groupId>com.kmerhosting</groupId>
  <artifactId>kmerhosting-sdk</artifactId>
  <version>0.1.0</version>
</dependency>
```

## 🔑 Authentication

Set your API key in the server environment:

```bash
export KMERHOSTING_API_KEY="kh_live_..."
```

All SDKs read `KMERHOSTING_API_KEY` automatically.

Keep this key on your server. Never put it in browser code, mobile apps, GitHub, or logs.

## ⚡ Quick use

### TypeScript

```ts
import { KmerHostingClient } from "@kmerhosting/sdk";

const client = new KmerHostingClient();
const services = await client.services.list();

console.log(services);
```

### Python

```python
from kmerhosting import KmerHostingClient

client = KmerHostingClient()
services = client.services.list()

print(services)
```

### PHP

```php
<?php

require __DIR__ . "/vendor/autoload.php";

use KmerHosting\\Client;

$client = new Client();
$services = $client->services()->all();

print_r($services);
```

### Java

```java
import com.kmerhosting.sdk.KmerHostingClient;

var client = new KmerHostingClient();
var services = client.services().list();

System.out.println(services);
```

## 🧩 What you can manage

- Account and service inventory
- Domains and DNS records
- Email Hosting
- Shared Hosting
- LXC VPS resources
- Safe service actions

Every write operation supports idempotency for safe retries.

## 📚 Documentation

- [Swagger UI](https://api.kmerhosting.com/docs)
- [OpenAPI specification](openapi/openapi.json)
- [API repository](https://github.com/KmerHosting/api)
- [Issues and support](https://github.com/KmerHosting/sdk/issues)

## 🏷️ Packages

| Language | Package manager | Package |
| --- | --- | --- |
| TypeScript | npm | `@kmerhosting/sdk` |
| Python | PyPI | `kmerhosting-sdk` |
| PHP | Composer | `kmerhosting/sdk` |
| Java | Maven Central | `com.kmerhosting:kmerhosting-sdk` |

## 📄 License

Apache-2.0. KmerHosting trademarks are not granted by the license.
