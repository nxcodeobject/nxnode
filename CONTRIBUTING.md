# Contributing to NxNode

Thanks for your interest. NxNode is a shared Node.js package store that links one
copy of each package into every project. This document covers how to set up the
repo, run the checks, and what we expect from a change.

## Requirements

- Node.js **>= 18** (CI runs 18, 20 and 22).
- npm.
- Windows, Linux or macOS. Windows notes: linking prefers `junction` because it
  needs no special privileges (unlike `symlink`).

## Setup

```bash
git clone https://github.com/nxcodeobject/nxnode.git
cd nxnode
npm install
```

Run the CLI directly from source:

```bash
node bin/nxnode.js --help
```

## Running the checks

Every change must keep these green:

```bash
npm run lint     # eslint src/
npm test         # node --test tests/*.test.js
```

Run both before opening a pull request. CI runs the same commands on Node 18/20/22.

## Project layout

```text
src/
├── cli/        command handlers (install, remove, link, provenance, store, ...)
├── config/     config.json handling (storePath, linkMode)
├── linker/     symlink/junction/hardlink/copy linking into node_modules
├── project/    package.json read/write, project discovery
├── provenance/ origin, license, OSV, SBOM/dataset export, quality signals
├── registry/   npm registry fetch (retry/timeout/redirect handling)
├── resolver/   semver, dependency tree, platform checks
└── store/      global store, metadata, lockfile, integrity, dedup
```

Each folder that had a notable fix or feature carries a `README.md` explaining the
problem, the decision and the status. Check those when touching a module.

## Guidelines

- **Plain JavaScript (CommonJS).** No TypeScript, no build step.
- **No new dependencies without a reason.** The project deliberately keeps its
  dependency list tiny (`tar` is the only runtime dependency). If you think one is
  needed, explain why in the PR — most things here are done with Node built-ins.
- **Match the existing style.** Small focused modules, one responsibility each.
  Prettier config is in `.prettierrc`; ESLint in `eslint.config.js`.
- **Don't change the public CLI surface** (command names, flags) without
  discussing it first in an issue.
- **Add tests** for behavior changes. Tests use the built-in `node:test` runner —
  no test framework dependency.
- **Keep the store layout stable.** Many things assume `packages/<name>/<version>`;
  changes there ripple into linker, lockfile and metadata.

## Tests

- Tests live in `tests/`. `unit.test.js` covers modules, `integration.test.js`
  covers flows (project, linker, lockfile).
- Prefer tests that don't need the network. When a test needs HTTP, spin up a
  local `http` server instead of calling a real registry (see the registry
  resilience tests in `tests/unit.test.js`).

## Pull requests

1. One logical change per PR.
2. Explain **why** in the description, not just what changed.
3. Make sure `npm run lint` and `npm test` pass.
4. Link the issue the PR addresses, if any.

## Reporting issues

Open an issue at https://github.com/nxcodeobject/nxnode/issues with:

- what you ran (`nxnode <command>`),
- what you expected,
- what happened (full output),
- your OS and Node version.

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE).
