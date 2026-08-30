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

## Documentation

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
