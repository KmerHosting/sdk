#!/usr/bin/env bash
# Fail when the OpenAPI document served by the live API differs from openapi/openapi.json.
#
# Usage: scripts/check-spec-drift.sh [URL]
#   URL defaults to $KMERHOSTING_OPENAPI_URL or https://api.kmerhosting.com/openapi.json
# Needs: curl, python3. Works locally and in CI. JSON is compared structurally, so
# whitespace and key order do not count as drift.
set -euo pipefail

url="${1:-${KMERHOSTING_OPENAPI_URL:-https://api.kmerhosting.com/openapi.json}}"
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
local_spec="$root/openapi/openapi.json"
live_spec="$(mktemp)"
trap 'rm -f "$live_spec"' EXIT

curl -fsS --retry 3 --retry-delay 2 -m 30 -H 'Accept: application/json' -o "$live_spec" "$url"

python3 - "$local_spec" "$live_spec" "$url" <<'PY'
import json, sys

local_path, live_path, url = sys.argv[1:4]
local = json.load(open(local_path))
live = json.load(open(live_path))

if local == live:
    print(f"OK: openapi/openapi.json matches {url}")
    sys.exit(0)

def walk(a, b, path=""):
    if isinstance(a, dict) and isinstance(b, dict):
        for key in sorted(set(a) | set(b)):
            if key not in a:
                yield f"only in live API: {path}/{key}"
            elif key not in b:
                yield f"only in repo copy: {path}/{key}"
            else:
                yield from walk(a[key], b[key], f"{path}/{key}")
    elif a != b:
        yield f"differs: {path or '/'}"

print(f"DRIFT: openapi/openapi.json differs from {url}", file=sys.stderr)
for index, line in enumerate(walk(local, live)):
    if index >= 40:
        print("... more differences omitted", file=sys.stderr)
        break
    print(f"  {line}", file=sys.stderr)
print("Fix: run scripts/sync-spec.sh --from-live, review the diff, and open a PR in each SDK repo.", file=sys.stderr)
sys.exit(1)
PY
