#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

bash -n build.sh
if grep -Eq '/Users/|Nexus/\.obsidian' build.sh Makefile; then
  echo 'A build/deploy command still refers to an owner-specific vault path' >&2
  exit 1
fi

make --no-print-directory build
first_hash="$(shasum -a 256 theme.css | awk '{print $1}')"
make --no-print-directory build
second_hash="$(shasum -a 256 theme.css | awk '{print $1}')"
[[ "$first_hash" == "$second_hash" ]] || {
  echo 'Repeated builds produced different theme.css files' >&2
  exit 1
}

for artifact in theme.css drafts/release-assets/*/theme.css; do
  grep -Fq 'Copyright (c) 2026 Heartkemy' "$artifact"
  grep -Fq 'Permission is hereby granted, free of charge' "$artifact"
  grep -Fq 'Guo Xiang' "$artifact"
  grep -Fq 'Steph Ango' "$artifact"
  grep -Fq 'possibly matt' "$artifact"
  grep -Fq 'Dalton Menezes' "$artifact"
  grep -Fq 'Gustavo Costa' "$artifact"
  grep -Fq 'Adrián' "$artifact"
done
node scripts/check-contrast.mjs

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT
if make --no-print-directory deploy >/dev/null 2>&1; then
  echo 'deploy unexpectedly accepted a missing TARGET' >&2
  exit 1
fi
make --no-print-directory deploy TARGET="$tmpdir/theme"
cmp theme.css "$tmpdir/theme/theme.css"
cmp manifest.json "$tmpdir/theme/manifest.json"

echo "Verified repeatable build ${first_hash} and explicit disposable deployment"
