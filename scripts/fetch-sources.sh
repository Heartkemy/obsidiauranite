#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
source ./sources.lock

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

verify_sha256() {
  local expected="$1"
  local file="$2"
  local actual
  actual="$(shasum -a 256 "$file" | awk '{print $1}')"
  [[ "$actual" == "$expected" ]] || {
    printf 'sha256 mismatch for %s: expected %s, got %s\n' "$file" "$expected" "$actual" >&2
    exit 1
  }
}

download() {
  local url="$1"
  local destination="$2"
  curl --fail --location --silent --show-error --retry 2 --output "$destination" "$url"
}

download "$OBSIDIANITE_URL" "$tmpdir/obsidianite.css"
verify_sha256 "$OBSIDIANITE_UPSTREAM_SHA256" "$tmpdir/obsidianite.css"
patch --batch --silent --output "$tmpdir/_obsidianite.css" "$tmpdir/obsidianite.css" < patches/obsidianite-local.patch
verify_sha256 "$OBSIDIANITE_VENDOR_SHA256" "$tmpdir/_obsidianite.css"

download "$THINGS_URL" "$tmpdir/_things.css"
verify_sha256 "$THINGS_SHA256" "$tmpdir/_things.css"

mv "$tmpdir/_obsidianite.css" _obsidianite.css
mv "$tmpdir/_things.css" _things.css
printf 'Fetched immutable upstream sources at %s and %s\n' "$OBSIDIANITE_REF" "$THINGS_REF"
