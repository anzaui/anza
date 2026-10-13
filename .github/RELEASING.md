# Releasing anza

The packages of this repository share **one version**:

| Package | Registry | Version file |
|---------|----------|--------------|
| `@anzaui/anza` (`library/`) | npm | `library/package.json` (+ `package-lock.json`) |
| `@anzaui/create-anza` (`create/`) | npm | `create/package.json`, including its `@anzaui/anza` dependency |
| `anza-cli` (`tools/`, binary `anza`) | GitHub release binaries, crates.io | `tools/Cargo.toml` (+ `Cargo.lock`) |

The server engines are separate repositories, git submodules under
`engines/`, each with its **own version**, release-please and release steps
(see each README): [anzaui/rust](https://github.com/anzaui/rust) (crate
`anza`), [anzaui/ts](https://github.com/anzaui/ts) (`@anzaui/engine`) and
[anzaui/py](https://github.com/anzaui/py) (PyPI `anza`). After releasing an
engine, bump its submodule pointer here (`git -C engines/<x> checkout vX.Y.Z`,
then commit). The shared golden fixtures live in `engines/fixtures/`; copy
them into the engines with `node tasks/engine-fixtures.js`.

The source of truth is `.release-please-manifest.json` (`{ ".": "<version>" }`).
`npm run versions:check` (also run in CI) fails if any file above, the web
version badges or the CLI's `--version` disagree with it.

## Flow

1. **Write conventional commits** (`fix: …`, `feat: …`, `feat!: …` /
   `BREAKING CHANGE:`). While the version is below 1.0, `fix` and `feat` bump
   the patch version and breaking changes bump the minor version.
2. **Release PR.** On every push to `main`,
   [release-please](workflows/release-please.yml) opens or updates one PR,
   `chore: release <version>`. It bumps every version file listed in
   `release-please-config.json` (`extra-files`) and adds an entry to the root
   `CHANGELOG.md`.
3. **Review the PR.** Edit the generated changelog entry in the PR branch if
   needed. If `CHANGELOG.md` has hand-written notes under `## [Unreleased]`, move
   them into the new entry. CI runs `versions:check` on the PR.
4. **Merge.** release-please then creates the tag `v<version>` (one tag for all
   packages) and the GitHub release with the changelog entry.
5. **Binaries.** The same workflow calls [release.yml](workflows/release.yml),
   which checks the tag against the manifest, runs `versions:check`, builds the
   CLI for every platform and attaches the binaries to the release.
6. **Publish to registries (manual for now).** No registry tokens are stored in
   the repository. npm: follow [NPM.md](../NPM.md) (`node tasks/publish.js`
   downloads the release binaries, verifies every tarball, then publishes
   `@anzaui/anza` and `@anzaui/create-anza` in order). The CLI crate, from a
   clean checkout of the tag:

   ```bash
   git checkout v<version>
   cargo publish --manifest-path tools/Cargo.toml              # anza-cli
   ```

### Forcing a version

To release a specific version (for example `0.6.0` at the end of the cleanup),
add `"release-as": "0.6.0"` to the `"."` package in `release-please-config.json`,
merge, let release-please update the PR, and **remove the key again after the
release** (otherwise every later release PR keeps proposing that version).

### Why not one release-please package per directory?

release-please's `linked-versions` plugin keeps several components on one
version, but it identifies them by component name, and
`include-component-in-tag: false` (needed for a single `v<version>` tag, which
`release.yml` and the binary download URLs rely on) makes every component name
empty, so the plugin links nothing. Per-component tags (`anza-cli-v0.6.0`, …)
would break the existing tag scheme. The repo is therefore one release-please
package (`"."`, release type `simple`) that bumps every package's version file
through `extra-files`. Notes on two of those entries:

- `tools/Cargo.lock` is matched with `$.package[?(@.name.value == 'anza-cli')]`:
  release-please's TOML parser wraps values in `{ value, start, end }` objects.
- The two web pages are updated through `x-release-please-version`
  annotations (HTML comments).

### Manual tag (fallback)

Pushing a `v<version>` tag by hand still triggers `release.yml`. The manifest
and every version file must already be at that version, or the verify job
fails. If the GitHub release already exists, the binaries are uploaded to it;
otherwise the release is created with the matching `CHANGELOG.md` section as
notes.

### Platform matrix

| OS      | Architecture | Runner         | Method |
|---------|--------------|----------------|--------|
| Linux   | x64          | ubuntu-latest  | Native |
| Linux   | arm64        | ubuntu-latest  | Cross  |
| macOS   | x64          | macos-latest   | Native |
| macOS   | arm64        | macos-latest   | Native |
| Windows | x64          | windows-latest | Native |

## Local build (fallback)

```bash
node tasks/publish.js --dry   # download the release binaries, pack and verify every npm package
```
