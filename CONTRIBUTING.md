# Contributing to Pond

Pond is in early development and is not accepting external pull requests at this time. We welcome bug reports and feature requests through [GitHub Issues](https://github.com/0x4bs3nt/pond/issues).

Search existing issues before opening a new one. For bugs, use the bug-report template and include steps to reproduce. For feature requests, describe the problem you want to solve and how the proposed feature would help.

The development instructions below are available for trying Pond locally and for maintainer use. We will update this guide when pull requests are welcome.

## Set up your environment

Install Bun 1.3.14 or later. If you use Nix, run `nix develop path:.` from the repository root. With direnv and nix-direnv configured, you can use `direnv allow` instead.

Clone the repository and check out the development branch:

```sh
git clone https://github.com/0x4bs3nt/pond.git
cd pond
git switch dev
bun install --frozen-lockfile
bun run dev
```

Press `q` or `Ctrl+C` to quit. Use `bun run start` to run without watching for source changes.

## Check your changes

Run these commands to validate local changes:

```sh
bun run format
bun run typecheck
bun run lint
bun run test
bun run format:check
```

CI installs dependencies with `bun install --frozen-lockfile` and runs the TypeScript, dependency-boundary, test, and formatting checks. When changing dependencies, use Bun and commit the updated `package.json` and `bun.lock` together.

## Module boundaries

Use a module's `index.ts` when importing it from another module. Files inside the same module can import each other directly. ESLint checks resolved imports, including type imports, re-exports, and dynamic imports with literal paths.

- Components depend on other components, theme tokens, and shared utilities. They do not import features, stores, services, or database adapters.
- Services depend on domain models and ports; concrete adapters are wired in app startup.
- Adapters do not import features or state. State does not import UI code.
- Features connect components to services and state through public APIs.
- State stores use `zustand/vanilla`; React subscriptions use `zustand` in features or app wiring. Subscribe to specific values rather than entire state snapshots. Create stores per app instance to keep workspaces and tests isolated.
- Domain models and ports remain independent of React, OpenTUI, and database drivers.

The allowed dependency directions and external packages are defined in `eslint.config.js`. When adding a new module category or external library, update that configuration deliberately. Production files must not import test files, helpers or fixtures under `tests/`, or `bun:test`, including inside their own module. Put module tests in a `tests/` directory within that module, mirroring nested responsibilities as needed. Name tests `*.test.ts(x)` or `*.spec.ts(x)`; tooling also supports `.js` and `.mjs` tests.

ESLint covers `src/`, `tools/`, and `eslint.config.js`. Use arrow functions for standalone functions and callbacks; class and object methods, constructors, getters, and setters are allowed. Use `const` when a binding is not reassigned, `let` when it is, and strict equality (`===` / `!==`). TypeScript checks types and Prettier handles formatting.

For interface changes, also run the app and describe the interactions you checked. Include screenshots or a recording when useful. Add focused tests when introducing behavior that can be meaningfully tested.

## Maintainer workflow

The following workflow is for maintainers while external pull requests are closed. Target `dev` and keep each pull request focused on one change. Describe the problem, what changed, and how you tested it. Link any related issue and mention known limitations.

Use a Conventional Commit title, such as:

- `feat: add table navigation`
- `fix: restore focus after closing an editor`
- `docs: clarify development setup`
- `chore: update dependencies`
- `ci: add formatting checks`

An optional scope is welcome, for example `feat(grid): add column selection`. Feature pull requests are squash merged, so their titles become commit messages. Keep your branch up to date with `dev` when GitHub requests it.

## Report bugs and vulnerabilities

Use the bug-report template for ordinary bugs. For security vulnerabilities, follow [SECURITY.md](SECURITY.md) and report privately.

## Stable releases

Feature PRs target `dev`. To release, open a same-repository PR from `dev` into `main`. All PRs are squash merged. There are no nightly builds or prerelease versions. Releases currently contain a source tag and release notes; executables and installers are not built yet.

The promotion PR title determines the highest-impact change in the release, not the individual commits on `dev`:

| Promotion title                         | Before 1.0 | From 1.0 onward |
| --------------------------------------- | ---------- | --------------- |
| `fix: ...` or `perf: ...`               | Patch      | Patch           |
| `feat: ...`                             | Minor      | Minor           |
| `feat!: ...` (or another type with `!`) | Minor      | Major           |

A `BREAKING CHANGE:` footer in the PR body also declares a breaking change. Ordinary `chore:`, `docs:`, and `refactor:` titles do not qualify as release PRs. Describe the release's user-facing changes in the PR body: that text becomes the release notes. This workflow does not infer changes hidden by squash merging.

The first release is explicitly `0.1.0`, regardless of the initial bump category. Subsequent versions are based on the latest stable version tag reachable from `main`. While versions start with `0`, compatibility is still evolving. To graduate to `1.0.0`, add a standalone `Release-As: 1.0.0` footer to the promotion PR body; arbitrary version overrides are not supported.

1. Open the `dev → main` PR with a release title and description. Draft PRs are not prepared until marked ready.
2. **Prepare release** writes `package.json`, `CHANGELOG.md`, and `.release.json` to `dev`. Do not edit those generated release entries manually. The version lives on `dev` before release so CI validates the exact files that will be published. Title/body edits or new commits regenerate the pending entry from `main`'s changelog without duplicating it.
3. Wait for **Checks** and **Release metadata** to pass on the updated PR. An initial metadata failure is expected while preparation is still running; the bot's commit triggers fresh CI. Keep the Conventional Commit PR title when squash merging.
4. Squash-merge into `main`. CI runs on the resulting commit. **Release** publishes only after that run succeeds, tagging that exact commit and creating a normal GitHub Release.
5. The release bot merges the released `main` commit back into `dev`. This is the sole non-squash synchronization operation: it preserves common ancestry between the long-lived branches. Wait for synchronization before starting another release. Normal feature and promotion PRs remain squash-only.

Do not delete `dev` after merging a release PR. If preparation loses a race with a new commit, rerun it on the latest PR revision. Failed CI never publishes a release. Publication can be retried by rerunning the failed Release workflow; it accepts an existing matching stable release but refuses to move a version tag. If the final sync job fails due to a concurrent push or conflict, resolve the conflict if necessary and rerun that job; the published release stays intact. Do not edit a merged promotion PR's description while publication is pending.
