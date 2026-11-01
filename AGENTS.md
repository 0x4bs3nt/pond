# Repository Guidelines

## Project Structure & Module Organization

Pond uses TypeScript, Bun, OpenTUI, React, and Zustand. Organize code by these architectural responsibilities; create directories only when functionality needs them.

- `src/app/`: application startup, shutdown, and concrete dependency wiring.
- `src/domain/`: shared models and correctness rules, independent of UI and drivers.
- `src/ports/`: interfaces for database access, profiles, credentials, and preferences.
- `src/adapters/`: port implementations; engine-specific SQL, decoding, and errors belong here.
- `src/services/`: workflows using domain models and ports; return results without mutating stores.
- `src/state/`: observable application/session state; separate fetched data, pending changes, and presentation state.
- `src/features/`: user actions connecting services, state, and UI.
- `src/components/`: reusable rendering and interaction primitives, independent of application workflows.
- `src/theme/`: visual tokens and theme definitions.
- `src/platform/`: terminal and OS integration, including clipboard, filesystem, and logging.
- `src/shared/`: small utilities genuinely needed across modules.
- `tests/`: integration, adapter-contract, and performance scenarios with fixtures; unit tests stay colocated.
- `tools/`: development, release, and component-gallery tooling.
- `.github/`: automation workflows and collaboration templates.

Import other modules through their `index.ts`; direct imports are allowed within a module. Components receive props rather than importing stores or services. Features coordinate state and interactions. Keep original data separate from pending edits. Use `zustand/vanilla` for stores and focused subscriptions in features. Keep keyboard event handling in dedicated `use-*-keyboard.ts` hooks.

## Development & Validation Commands

Install Bun 1.3.14 or later, then run `bun install --frozen-lockfile`. Alternatively, Nix users can enter the development environment with `nix develop path:.`.

- `bun install --frozen-lockfile`: install pinned dependencies.
- `bun run dev`: run with automatic source-change restarts.
- `bun run start`: run without watching.
- `bun run typecheck`: check TypeScript.
- `bun run lint`: enforce coding rules and module boundaries.
- `bun run test`: run existing Bun tests.
- `bun run format:check`: check Prettier formatting; `bun run format` rewrites files.

There is no packaged executable build yet. `bun run check` also rewrites formatting.

Always run `bun run check` after finishing code changes and before reporting the work complete. Resolve failures and rerun until it passes. Review any formatting changes it makes. If the command cannot run or a failure cannot be resolved, clearly report the blocker and do not claim validation passed.

## Coding Style & Naming

Use four-space indentation, single quotes, semicolons, and a 120-column print width, enforced by Prettier. Prefer arrow functions, `const`, and strict equality. Name React components in PascalCase and hooks/utilities in kebab-case. Follow `eslint.config.js` dependency rules; avoid speculative abstractions or empty future modules.

## Testing Guidelines

Tests use `bun:test` and OpenTUI rendering utilities. Colocate `*.test.ts(x)` or `*.spec.ts(x)` with relevant code. No numeric coverage threshold is configured.

Write tests only when they protect actual business logic, prevent regressions between releases, verify critical behavior, or address a concrete failure risk worth maintaining coverage for. Prioritize data integrity, state transitions, transaction handling, and release correctness. Do not write tests merely because code changed, to increase test counts or coverage percentages, or to mirror implementation details. Avoid routine rendering, styling, trivial wiring, and redundant tests. For each new test, identify the meaningful failure it would catch. Run interface changes locally and report the scenarios checked.

## Commits & Pull Requests

External PRs are currently closed; see `CONTRIBUTING.md`. Maintainer PRs target `dev` and are squash merged. Use Conventional Commit titles, e.g. `feat(table-browser): add staged mock cell editing` or `fix(dev): restore terminal cleanup`.

Describe the problem, resulting behavior, validation, related issues, and limitations. Include UI screenshots when useful. Commit dependency changes with `bun.lock`. Release promotions target `main` from `dev`; do not manually edit generated release metadata. Never commit credentials; report vulnerabilities through `SECURITY.md`.

## Contribution Documentation

Do not add new sections, topics, or implementation details to `CONTRIBUTING.md`. Update it only when a change alters behavior already documented there, and limit the edit to keeping that existing guidance accurate. New features or tooling do not automatically require additions to `CONTRIBUTING.md`.

## Agent Git Workflow

Agents must never stage files, create commits, push changes, or create pull requests. These actions are reserved for the user. When one of these steps is needed, tell the user what is ready and what action to take instead of performing it. Agents may use read-only Git commands, such as `git status`, `git diff`, `git log`, and `git show`, at any time.
