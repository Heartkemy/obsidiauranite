# Contributing

Keep changes small and preserve upstream notices. Do not edit generated
`theme.css` directly; change `build.sh`, `palette.sed`, or the tracked source
patch instead.

Before opening a change:

```bash
make check
```

Use `make fetch` only when deliberately refreshing the immutable inputs in
`sources.lock`; review the resulting diff and update the relevant hash, source
reference, and notice if the upstream component changes. Normal local work does
not need a vault, a personal path, a secret, or an external account.

Use a `feature/*` branch through the repository's git-flow configuration and
use conventional commit messages. Do not create releases, tags, or uploaded
assets as part of a contribution.
