# Releasing to npm

How to publish the npm packages of this repository. For the whole release flow (release PR, tag, binaries, crates.io, PyPI) see [.github/RELEASING.md](.github/RELEASING.md).

| Package | Folder | Ships |
|---------|--------|-------|
| `@anzaui/anza` | `library/` | Browser library, types, schemas, and the `anza` CLI binary for every platform |
| `@anzaui/create-anza` | `create/` | `npm create @anzaui/anza` (depends on `@anzaui/anza` at the same version) |

Both share one version, the one in `.release-please-manifest.json`. The TypeScript server engine `@anzaui/engine` lives in its own repository ([anzaui/ts](https://github.com/anzaui/ts)) with its own version and release steps (see its README).

## One-time setup

```bash
npm login                 # an account with publish rights on the @anzaui scope
gh auth login             # used to download the CLI binaries from the GitHub release
```

Turn on two-factor authentication for publishing on npm. Then pass the code with `--otp`.

## Release steps

### 1. Push `main`

```bash
git push origin main
```

release-please opens or updates the PR **"chore: release X.Y.Z"**. It bumps every version file and writes the changelog entry. Wait for CI to pass on it.

### 2. Merge the release PR

This tags `vX.Y.Z`, creates the GitHub release, and runs `release.yml`, which builds the CLI for five platforms and attaches them to the release:

`anza-linux-x64`, `anza-linux-arm64`, `anza-macos-x64`, `anza-macos-arm64`, `anza-windows-x64.exe`

**Wait until all five binaries are attached** before going on (GitHub → Releases → `vX.Y.Z` → Assets). The publish script refuses to run without them.

### 3. Dry run from the tag

```bash
git fetch --tags
git checkout vX.Y.Z
node tasks/publish.js --dry
```

The script:

1. checks that the versions agree (`versions:check`);
2. downloads the five binaries from the GitHub release into `library/bin/anza/`;
3. packs both packages and **fails if any tarball is missing a required file** (each binary, `src/index.js`, `types/index.d.ts`, create's `index.js`) or has the wrong name or version.

Nothing is published. You should see two `ok` lines.

### 4. Publish

```bash
node tasks/publish.js --otp 123456      # or: npm run publish:npm -- --otp 123456
```

For a real publish the script also requires:

- `HEAD` is exactly the tag `vX.Y.Z`;
- no uncommitted changes;
- `npm whoami` works.

It publishes in dependency order: `@anzaui/anza` → `@anzaui/create-anza`. Versions that are already on npm are skipped, so if a step fails (for example the OTP expired), fix it and run the same command again.

### 5. Check the published packages

```bash
npm view @anzaui/anza version
npx -p @anzaui/anza@X.Y.Z anza --version        # prints "anza X.Y.Z"
npm create @anzaui/anza@X.Y.Z /tmp/anza-smoke   # scaffold a project
```

Then go back to `main`:

```bash
git checkout main
rm -f library/bin/anza/anza-*      # downloaded binaries (gitignored)
```

## Fixing a bad release

You can't republish a version on npm. To correct a broken version:

1. fix the problem and release a new patch version (`fix: …` commit → release PR → merge → publish);
2. mark the broken version deprecated, so installs warn:

```bash
npm deprecate @anzaui/anza@X.Y.Z "broken: <reason>; use X.Y.Z+1 or later"
```

`npm unpublish` works only within 72 hours, and only if nothing depends on the version. Prefer `deprecate`.

### Known bad versions

0.5.0 was published broken. After 0.6.0 is out, deprecate them:

```bash
npm deprecate @anzaui/anza@0.5.0 "missing the anza CLI binary; use 0.6.0 or later"
npm deprecate @anzaui/engine@0.5.0 "missing compiled dist/; use 0.6.0 or later"
npm deprecate @anzaui/create-anza@0.5.0 "depends on a broken @anzaui/anza; use 0.6.0 or later"
```

- `@anzaui/anza@0.5.0` has no CLI binary, so `npx anza` fails.
- `@anzaui/engine@0.5.0` has no `dist/`, so the import fails.

The checks in `tasks/publish.js` stop both from happening again.

## Package size

`@anzaui/anza` carries all five CLI binaries (about 17 MB packed), so every install downloads every platform. A later improvement is one optional dependency per platform (the esbuild model: `@anzaui/anza-linux-x64`, …), so each machine downloads only its own binary.
