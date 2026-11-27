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

### Keeping the spec in sync

`openapi/openapi.json` is the canonical copy for the SDK repositories and must match what <https://api.kmerhosting.com/openapi.json> serves. The `docs` repository keeps a copy too.

```bash
scripts/check-spec-drift.sh                   # fail (exit 1) if the live API differs from this repo's copy
scripts/sync-spec.sh --from-live              # pull the live spec, then copy it to the sibling clones
scripts/sync-spec.sh --check                  # report sibling clones that are out of date
scripts/sync-spec.sh --repos-dir ~/src        # clones live somewhere other than next to this repo
```

Both scripts need only `curl` and `python3`, so they run on a laptop as well as in CI. The `Spec drift` workflow runs the check daily and on demand (it is not a pull-request gate, because a spec change legitimately precedes the API deploy). If GitHub Actions minutes are unavailable, run the check locally before each release. After `sync-spec.sh` copies the file, commit and open a pull request in each target repository (`typescript-sdk`, `python-sdk`, `php-sdk`, `java-sdk`, `docs`). A failure straight after an API change is expected until the API is deployed.

## Support

Report SDK issues in the repository for the language SDK you are using.

## License

Apache-2.0. KmerHosting trademarks are not granted by the license.
