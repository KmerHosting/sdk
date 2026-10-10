# KmerHosting SDKs

Official server-side SDKs for the KmerHosting API. Each language SDK is maintained and released from its own repository.

| Language | Repository | Install |
| --- | --- | --- |
| TypeScript | [KmerHosting/typescript-sdk](https://github.com/KmerHosting/typescript-sdk) | `npm install @kmerhosting/sdk` |
| Python | [KmerHosting/python-sdk](https://github.com/KmerHosting/python-sdk) | `pip install kmerhosting-sdk` |
| PHP | [KmerHosting/php-sdk](https://github.com/KmerHosting/php-sdk) | `composer require kmerhosting/sdk` |
| Java | [KmerHosting/java-sdk](https://github.com/KmerHosting/java-sdk) | `com.kmerhosting:kmerhosting-sdk` |

All clients read `KMERHOSTING_API_KEY` from the server environment by default. Keep API keys in trusted server-side code and out of browser code, mobile apps, repositories, and logs.

## API contract

The OpenAPI snapshot is available in [`openapi/openapi.json`](openapi/openapi.json). Live API documentation: <https://api.kmerhosting.com/docs>.

## Support

Report SDK issues in the repository for the language SDK you are using.

## License

Apache-2.0. KmerHosting trademarks are not granted by the license.
