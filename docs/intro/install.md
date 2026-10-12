# Install

Install `@anzaui/anza` from npm. The package ships the library, TypeScript types, and a **prebuilt** `anza` CLI binary for your platform — no Rust toolchain required.

## npm (recommended)

```bash
npm install @anzaui/anza
```

This installs:

- Library source and type declarations under `@anzaui/anza/*`
- The `anza` command — a Node wrapper that spawns the correct prebuilt Rust binary for your OS and CPU

The package is on [npm](https://www.npmjs.com/package/@anzaui/anza). Each version bundles platform binaries under `node_modules/@anzaui/anza/bin/anza/` (Linux and macOS on x64 and arm64, Windows on x64).

In a project with `@anzaui/anza` as a dependency, run the CLI via `npx anza` or an npm script (see [Start](start.md)).

`anza build` bundles production output with [Rolldown](https://rolldown.rs), loaded from your project. It is optional: without it, the build ships unbundled modules and prints a warning.

```bash
npm install -D rolldown
```

## New projects

Scaffold an app with the create package. It adds `@anzaui/anza` and `rolldown` as devDependencies:

```bash
npm create @anzaui/anza myapp
cd myapp
npm install
```

See [Start](start.md) for what gets generated and how to run `npm run dev`.

## GitHub releases (standalone binary)

Each tagged release on [GitHub](https://github.com/anzaui/anza/releases) attaches the same prebuilt CLI binaries. Use this if you want the binary on your `PATH` without installing the npm package globally.

| Platform | Binary |
| -------- | ------ |
| Linux x64 | `anza-linux-x64` |
| Linux arm64 | `anza-linux-arm64` |
| macOS x64 | `anza-macos-x64` |
| macOS arm64 | `anza-macos-arm64` |
| Windows x64 | `anza-windows-x64.exe` |

Download the file for your platform, make it executable on Unix (`chmod +x anza-linux-x64`), rename or symlink to `anza`, and put it on your `PATH`. You still need `@anzaui/anza` in your project for library imports.

There is no curl install script — use npm or download from GitHub releases.

## Verify

```bash
npx anza --help
```

You should see the command list: `scan`, `build`, `dev`, `doctor`, `create`, and others.

## Building from source (contributors only)

If you are developing inside the [anza repo](https://github.com/anzaui/anza), compile the CLI locally with `node tasks/build.js`. See the repo README — this is **not** part of the normal install path for app developers.
