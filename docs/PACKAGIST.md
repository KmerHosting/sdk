# Packagist release strategy

The repository root is the Composer package `kmerhosting/sdk`. Keeping
`composer.json` at the repository root lets Packagist read the package metadata
and autoload map directly.

## Version tags

PHP releases use standard Composer/Packagist tags:

```text
v0.1.0
v0.1.1
v1.0.0
```

Do not use `php-v0.1.1`. Packagist derives stable versions from `X.Y.Z` or
`vX.Y.Z` tags; language-specific prefixes are not stable Composer versions.

The other SDK release tags remain package-specific:

| Package | Tag pattern |
| --- | --- |
| npm | `npm-vX.Y.Z` |
| PyPI | `python-vX.Y.Z` |
| Maven Central | `java-vX.Y.Z` |
| Packagist | `vX.Y.Z` |

## One-time Packagist setup

1. Submit `https://github.com/KmerHosting/sdk` at
   <https://packagist.org/packages/submit>.
2. Configure the Packagist GitHub service hook for instant updates, or add
   `PACKAGIST_USERNAME` and `PACKAGIST_API_TOKEN` as GitHub repository secrets.
3. The `Publish PHP SDK` workflow will validate the package and call the
   Packagist update API whenever a `v*` tag is pushed.

The package must be submitted once by a Packagist maintainer; the update API
only refreshes an existing package.

## Release

After the package is registered and the PHP checks pass:

```bash
git tag -a v0.1.1 -m "release: PHP SDK v0.1.1"
git push origin v0.1.1
```
