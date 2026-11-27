#!/usr/bin/env bash
# Copy the OpenAPI spec to the other KmerHosting repositories.
#
# Usage: scripts/sync-spec.sh [--from-live] [--check] [--repos-dir DIR]
#   --from-live      first replace openapi/openapi.json with the live API document
#   --check          copy nothing; exit 1 when a target differs
#   --repos-dir DIR  directory that holds the sibling clones (default: parent of this repo)
#
# Targets (relative to the repos dir):
#   typescript-sdk/openapi/openapi.json  python-sdk/openapi/openapi.json
#   php-sdk/openapi/openapi.json         java-sdk/openapi/openapi.json
#   docs/openapi.json
# Missing clones are skipped with a notice. Commit and open the PR in each repo yourself.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
repos_dir="$(dirname "$root")"
from_live=0
check=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --from-live) from_live=1 ;;
    --check) check=1 ;;
    --repos-dir) repos_dir="${2:?directory}"; shift ;;
    -h|--help) sed -n '2,13p' "${BASH_SOURCE[0]}"; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

source_spec="$root/openapi/openapi.json"
if [[ $from_live -eq 1 ]]; then
  tmp="$(mktemp)"
  trap 'rm -f "$tmp"' EXIT
  curl -fsS --retry 3 -m 30 -o "$tmp" "${KMERHOSTING_OPENAPI_URL:-https://api.kmerhosting.com/openapi.json}"
  # Normalise to the repository format: 2-space indent and a trailing newline.
  python3 -c 'import json,sys; print(json.dumps(json.load(open(sys.argv[1])), indent=2, ensure_ascii=False))' "$tmp" > "$source_spec"
  echo "Updated $source_spec from the live API"
fi

python3 -m json.tool "$source_spec" >/dev/null
targets=(typescript-sdk/openapi/openapi.json python-sdk/openapi/openapi.json php-sdk/openapi/openapi.json java-sdk/openapi/openapi.json docs/openapi.json)
status=0
for target in "${targets[@]}"; do
  path="$repos_dir/$target"
  if [[ ! -d "$(dirname "$path")" ]]; then
    echo "skip: $target (no clone at $repos_dir)"
    continue
  fi
  if [[ -f "$path" ]] && cmp -s "$source_spec" "$path"; then
    echo "in sync: $target"
  elif [[ $check -eq 1 ]]; then
    echo "OUT OF SYNC: $target"
    status=1
  else
    cp "$source_spec" "$path"
    echo "updated: $target"
  fi
done
exit $status
