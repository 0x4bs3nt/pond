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
- `tests/`: integration, adapter-contract, and performance scenarios with fixtures; module tests live in a `tests/` directory inside their owning module.
- `tools/`: development, release, and component-gallery tooling.
- `.github/`: automation workflows and collaboration templates.

Import other modules through their `index.ts`; direct imports are allowed within a module. Components receive props rather than importing stores or services. Features coordinate state and interactions. Keep original data separate from pending edits. Use `zustand/vanilla` for stores and focused subscriptions in features. Keep keyboard event handling in dedicated `use-*-keyboard.ts` hooks.

## Development & Validation Commands

Install Bun 1.3.14 or later, then run `bun install --frozen-lockfile`. Alternatively, Nix users can enter the development environment with `nix develop path:.`.

- `bun install --frozen-lockfile`: install pinned dependencies.
- `bun run dev`: run with automatic source-change restarts.
- `bun run start`: run without watching.
- `bun run gallery`: exercise isolated components with mock props; see `docs/component-gallery.md`.
- `bun run gallery:bench`: record headless grid latency, node counts, and memory; see `docs/grid-performance.md`.
- `bun run typecheck`: check TypeScript.
- `bun run lint`: enforce coding rules and module boundaries.
- `bun run test`: run existing Bun tests.
- `bun run format:check`: check Prettier formatting; `bun run format` rewrites files.

There is no packaged executable build yet. `bun run check` also rewrites formatting.

Always run `bun run check` after finishing code changes and before reporting the work complete. Resolve failures and rerun until it passes. Review any formatting changes it makes. If the command cannot run or a failure cannot be resolved, clearly report the blocker and do not claim validation passed.

## Coding Style & Naming

Use four-space indentation, single quotes, semicolons, and a 120-column print width, enforced by Prettier. Prefer arrow functions, `const`, and strict equality. Name React components in PascalCase and hooks/utilities in kebab-case. Follow `eslint.config.js` dependency rules; avoid speculative abstractions or empty future modules.

Keep named types and interfaces in the owning module’s `types.ts`, including component props, hook options, and state contracts. Use `import type` and expose types needed by other modules through `export type` in `index.ts`. Larger subsystems may have their own `types.ts`; avoid a global types barrel. Keep simple inline annotations and inferred local values where a named type adds no clarity.

## Testing Guidelines

Tests use `bun:test` and OpenTUI rendering utilities. Place `*.test.ts(x)` or `*.spec.ts(x)` under the owning module’s `tests/` directory, not beside implementation files. Mirror nested responsibilities where helpful, e.g. `src/components/data-grid/tests/navigation/move-selection.test.ts`. Keep test-only helpers and fixtures under `tests/` too; production code must not import them. Tooling follows the same convention (`tools/tests/`, `tools/release/tests/`). Reserve root `tests/` for future cross-module integration, contract, and performance suites. No numeric coverage threshold is configured.

Write tests only when they protect actual business logic, prevent regressions between releases, verify critical behavior, or address a concrete failure risk worth maintaining coverage for. Prioritize data integrity, state transitions, transaction handling, and release correctness. Do not write tests merely because code changed, to increase test counts or coverage percentages, or to mirror implementation details. Avoid routine rendering, styling, trivial wiring, and redundant tests. For each new test, identify the meaningful failure it would catch. Run interface changes locally and report the scenarios checked.

Use `bun run gallery` to validate reusable UI components. Add gallery scenarios for new reusable components and update relevant scenarios when their behavior changes, using public component APIs and mock props without application stores. Exercise keyboard/mouse interaction, focus, resizing, and relevant palettes or edge cases; report what was checked and any limitations. Gallery validation complements meaningful behavior and regression tests; do not add routine snapshots solely for coverage. See [docs/component-gallery.md](docs/component-gallery.md).

## Logging & Error Handling

Read [docs/error-handling.md](docs/error-handling.md) before changing logging, error handling, or shutdown. Application logging is always enabled and local; performance profiling is separate and opt-in. Do not add remote telemetry or uploads as part of ordinary logging work.

Use the structured logger exposed by `src/platform/logging/index.ts`, assembled at app startup. Keep filesystem access in that module and respect dependency boundaries; reusable components report through callbacks rather than importing the logger. Do not create independent loggers in components, scatter raw `console.log`/`console.error` calls, or write directly to the terminal while the TUI owns it. The existing console interception is an upstream integration, not the application logging API.

Log meaningful lifecycle events and unexpected failures using fixed, typed event names and sources. Current events are `app.started`, `app.stopped`, `ui.failed`, `app.fatal`, `runtime.error`, `runtime.warning`, and `shutdown.failed`. Startup/shutdown use info severity, runtime warnings use warn, and failure events use error. The logger adds timestamp, application/runtime versions, and process ID. Add new events only for a concrete diagnostic need; avoid per-frame, per-keystroke, per-cell, or routine navigation logs.

Pass errors through the logger's sanitizer. Retain known error classifications, allowlisted OS codes, bounded source locations, and bounded causes. Never persist raw error messages/stacks, thrown strings, arbitrary object dumps, or serialized driver errors. Never log passwords, tokens, credentials, connection strings, SQL text/parameters, database rows/cell values, clipboard contents, or raw keyboard input. Do not put sensitive values into event names or context fields. Any expansion of logged fields needs explicit sanitization and tests proving secrets remain excluded.

Expected validation failures belong in the relevant UI, with safe actionable feedback and pending edits preserved where safe. Do not log invalid user input as a fatal error. Route unexpected failures through the existing boundary/lifecycle handling; do not silently swallow them or continue after an unhandled fatal error. React boundaries do not catch asynchronous or event-handler failures. Preserve duplicate-report suppression, idempotent cleanup, bounded flushes, terminal restoration, and nonzero fatal exit status. Do not automatically remount a failed workspace or claim memory-only edits survived termination. Recheck OpenTUI/React error propagation when upgrading those dependencies.

Keep logs bounded: currently 256 KiB per file, one rotated backup per process, eight retained files from exited processes, and at most 32 queued records. Create new log directories privately and keep log files private where supported; never change permissions of an existing directory, including a `POND_LOG_DIR` override. Preserve priority for fatal records, overflow accounting, and nonrecursive handling of storage failures. Logs are diagnostic records, not a durable audit trail; native crashes, forced termination, or blocked execution can prevent cleanup and flushing.

Inspect logs with `bun run logs` or `bun run logs --follow`; the packaged CLI accepts `pond logs` and `pond logs --follow` (`-f`). These commands must not launch the TUI or generate their own logs. Follow mode must tolerate missing logs, rotation, and app restarts and stop on Ctrl+C. Records go to stdout; command guidance/errors go to stderr. Prefer these commands over shell-specific path/glob instructions.

Default locations are `$XDG_STATE_HOME/pond/logs` (falling back to `~/.local/state/pond/logs`) on Linux, `~/Library/Logs/Pond` on macOS, and `%LOCALAPPDATA%\\Pond\\logs` on Windows (falling back to the user's `AppData\\Local\\Pond\\logs`). An absolute `POND_LOG_DIR` overrides the directory; relative overrides are ignored. Files are named `pond-<pid>.jsonl` with `.1` backups. Use isolated temporary directories in tests and never commit generated logs or profiling artifacts.

Logging changes require meaningful tests against actual written records: verify required fields, severity, ordering, sensitive-data exclusion, and relevant rotation/retention or write-failure behavior. For lifecycle or reader changes, cover the affected failure paths, deduplication, bounded shutdown, follow/rotation, and CLI exit behavior. Manually check terminal restoration when shutdown changes, and report which platforms were exercised. Do not test only that a logging mock was called.

## Commits & Pull Requests

External PRs are currently closed; see `CONTRIBUTING.md`. Maintainer PRs target `dev` and are squash merged. Use Conventional Commit titles, e.g. `feat(table-browser): add staged mock cell editing` or `fix(dev): restore terminal cleanup`.

Describe the problem, resulting behavior, validation, related issues, and limitations. Include UI screenshots when useful. Commit dependency changes with `bun.lock`. Release promotions target `main` from `dev`; do not manually edit generated release metadata. Never commit credentials; report vulnerabilities through `SECURITY.md`.

## Contribution Documentation

Track implementation work in the [Pond GitHub Project](https://github.com/users/0x4bs3nt/projects/5). When available, read local `docs/architecture.md` for design guidance and `docs/releases.md` for release criteria. After completing a ticket, check those criteria and remind the user when a phase is ready for release; never publish automatically.

Do not add new sections, topics, or implementation details to `CONTRIBUTING.md`. Update it only when a change alters behavior already documented there, and limit the edit to keeping that existing guidance accurate. New features or tooling do not automatically require additions to `CONTRIBUTING.md`.

## Agent Git Workflow

Agents must never stage files, create commits, push changes, or create pull requests. These actions are reserved for the user. When one of these steps is needed, tell the user what is ready and what action to take instead of performing it. Agents may use read-only Git commands, such as `git status`, `git diff`, `git log`, and `git show`, at any time.
