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

The allowed dependency directions and external packages are defined in `eslint.config.js`. When adding a new module category or external library, update that configuration deliberately. Production files must not import test files or `bun:test`, including inside their own module. Name tests `*.test.ts(x)` or `*.spec.ts(x)`; tooling also supports `.js` and `.mjs` tests.

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
