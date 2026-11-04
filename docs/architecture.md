# Pond architecture

Design guidance for Pond. Track implementation tasks and progress in the [Pond GitHub Project](https://github.com/users/0x4bs3nt/projects/5). Release readiness criteria live in [releases.md](releases.md). This document describes the intended architecture; it does not imply every subsystem is implemented.

## Purpose and scope

Pond is a terminal database application inspired by the database tools in JetBrains IDEs. Users can connect to a database, explore schemas and tables, inspect column types, browse rows, and stage edits, inserts, and deletions before applying them.

The initial stack is TypeScript, OpenTUI, and React, with PostgreSQL as the first supported database. The architecture must allow additional database engines without rewriting the interface or application workflows.

Start with one TypeScript project rather than a monorepo. Use directories, explicit public APIs, and enforced dependency boundaries before introducing separate packages.

## Architectural principles

- UI components never access database drivers directly.
- PostgreSQL-specific SQL, metadata queries, value handling, and errors stay in the PostgreSQL adapter.
- Domain models describe application concepts independently of React, OpenTUI, and database drivers.
- Services coordinate workflows through interfaces and return results rather than importing UI stores.
- Features connect user interactions, services, and state.
- Fetched values, pending changes, and presentation state remain separate.
- Modules expose small public APIs and do not reach into each other's internals.
- Create directories when functionality arrives; do not scaffold empty future systems.

## Proposed directory structure

```text
src/
├── app/                         # Startup and dependency wiring
│   ├── bootstrap.ts
│   ├── create-services.ts
│   ├── create-stores.ts
│   ├── register-adapters.ts
│   └── shutdown.ts
├── domain/                      # Shared concepts and rules; no UI or drivers
│   ├── connections/
│   ├── schema/
│   ├── data/
│   ├── changes/
│   ├── queries/
│   └── errors/
├── ports/                       # Interfaces for external capabilities
│   ├── database/
│   ├── profiles/
│   ├── credentials/
│   └── preferences/
├── adapters/                    # Implementations of external interfaces
│   ├── databases/
│   │   ├── registry.ts
│   │   └── postgres/
│   │       ├── index.ts
│   │       ├── adapter.ts
│   │       ├── capabilities.ts
│   │       ├── connection/
│   │       ├── introspection/
│   │       ├── browsing/
│   │       ├── mutations/
│   │       ├── values/
│   │       ├── queries/
│   │       └── errors/
│   ├── profiles/
│   ├── credentials/
│   └── preferences/
├── services/                    # Application workflows
│   ├── connections/
│   ├── schema/
│   ├── browsing/
│   ├── editing/
│   └── queries/
├── state/                       # Observable application and session state
│   ├── workspace/
│   ├── connections/
│   ├── explorer/
│   ├── table-sessions/
│   ├── query-sessions/
│   └── preferences/
├── features/                    # Connect services and state to the interface
│   ├── connection-manager/
│   ├── schema-explorer/
│   ├── table-browser/
│   ├── row-editor/
│   ├── structure-view/
│   └── query-console/
├── components/                  # Reusable OpenTUI + React building blocks
│   ├── primitives/
│   ├── layout/
│   ├── navigation/
│   ├── feedback/
│   ├── inputs/
│   ├── editors/
│   └── data-grid/
├── theme/
│   ├── tokens.ts
│   ├── themes/
│   └── index.ts
├── platform/                    # Terminal and operating-system integration
│   ├── terminal/
│   ├── clipboard/
│   ├── filesystem/
│   └── logging/
└── shared/                      # Small, genuinely cross-cutting utilities
    ├── async/
    └── identifiers/

tests/
├── integration/
│   └── postgres/
├── contracts/
│   └── database-adapter/
├── performance/
│   └── data-grid/
└── fixtures/

tools/
└── component-gallery/           # Components exercised with mock data
```

## Layer responsibilities

| Layer      | Responsibility                                    | Example                                                              |
| ---------- | ------------------------------------------------- | -------------------------------------------------------------------- |
| Domain     | Meaning and correctness of application data       | A pending insert differs from an update; NULL differs from a default |
| Ports      | Contracts for external operations                 | Describe a table, fetch a page, apply a change set                   |
| Adapters   | Database and storage implementations              | PostgreSQL catalog queries, parameter binding, error translation     |
| Services   | Application workflows                             | Apply edits, then refresh affected data                              |
| State      | What the application currently knows and displays | Open tabs, fetched pages, pending edits, active cell                 |
| Features   | Connect interactions to services and state        | Enter on a selected cell opens its editor                            |
| Components | Rendering and reusable interaction mechanics      | Grid, modal, input field, tab strip                                  |
| App        | Assemble and start the application                | Register PostgreSQL and supply dependencies                          |

Services return results instead of mutating stores. Features coordinate service calls and state updates. This keeps services usable in tests or a future non-TUI interface.

## Pluggable database support

Avoid a giant database interface with dozens of unrelated methods. Define a small adapter entry point that creates a connected session exposing focused interfaces:

```text
Database adapter
  ├── Connection configuration
  └── Connected session
      ├── Capabilities
      ├── Schema inspection
      ├── Table browsing
      ├── Mutations
      ├── Query execution
      └── Close / cancellation
```

The registry selects an adapter by an engine identifier such as `postgres`.

Adding an engine should primarily require implementing its adapter, registering it, running common adapter contract tests, and adding engine-specific controls only where required.

### Shared contracts must preserve database differences

- Express capabilities explicitly: transaction behavior, returning modified rows, cancellation, and supported filters may vary.
- Preserve native type details alongside broad editor categories.
- Model namespaces without assuming every engine follows PostgreSQL's schema hierarchy.
- Keep SQL generation in adapters. Services pass structured browse and mutation requests rather than PostgreSQL SQL strings.
- Allow unfamiliar values to remain inspectable as read-only representations.
- Preserve exact values; do not coerce every numeric type into JavaScript numbers.

Initially, pluggable means adding an adapter in source without rewriting existing layers. Runtime installation of third-party plugins is out of scope.

### Implemented database contracts

The first implementation uses the existing mock workspace to exercise these boundaries:

- `domain/database` owns connection targets, structured namespace/table references, native column types, exact values, row identities, bounded page requests/results, and expected database error codes. It has no React, driver, or OS dependencies.
- `ports/database` exposes adapter registration lookup, asynchronous connection/session contracts, schema inspection, bounded browsing, and idempotent close. Session capabilities describe namespace and primary-key support and the maximum page size. Mutation, arbitrary SQL, and cancellation APIs are added when their workflows arrive.
- `adapters/databases` selects explicitly registered adapters by engine ID. Duplicate IDs fail at startup; unsupported engines return an error instead of falling back to another adapter. The `mock` adapter provides the demo through these ports and returns detached results.
- `services/database` connects through the registry and combines metadata with a row page. Services return domain results and never import UI stores or concrete adapters. Expected errors contain fixed application-owned codes; unexpected failures reject to the existing lifecycle handling.
- `app/load-mock-workspace.ts` registers the mock adapter, reads its small fixture, and closes the session in `finally`. The table-browser presenter maps domain data into grid props; widths and pending edits stay outside the adapter. The app receives the resulting tables as props.

Namespace paths are ordered identifier parts, including an empty path for engines without namespaces. Never split a dotted display name to form a database identifier. Native type strings retain modifiers and are descriptive metadata, not SQL fragments. Values distinguish SQL NULL, exact adapter text, and unsupported read-only representations; no generic number, date, or JSON conversion occurs at the boundary. Ordered primary-key values are separate from display row IDs, and rows without reliable keys have a null identity. These contracts do not establish write eligibility yet.

Page reads require a nonnegative safe-integer offset and a positive safe-integer limit within the session's maximum. Offset order and row IDs outside a result are adapter-defined; concurrent pagination stability is not promised. The mock adapter has a fixed fixture order and a 250-row maximum. Preloading all three small mock tables is specific to the demo, not the loading strategy for a real database.

The app also registers the PostgreSQL adapter for the [connection manager](connections.md). `domain/connections` validates non-secret profiles; profile and credential ports isolate file persistence and one-use memory credentials. The connection service owns one session, serializes replacement, aborts pending handshakes, and closes late results. Features update a vanilla Zustand connection store and release session subscriptions on replacement/unmount. App shutdown disposes the service with bounded cleanup.

The PostgreSQL adapter uses one `pg` client and an owned socket so cancellation interrupts stalled handshakes. Network options and fixed error codes cross the database port; passwords travel separately. TLS supports disabled, required encryption, and verified certificate/hostname modes. The PostgreSQL session currently reports schema/browsing operations as unsupported, rather than returning misleading empty results. Catalog metadata and value decoding follow in #17–#18; real browsing, table request/session ownership, and PostgreSQL integration validation follow in #19–#21. Existing lint rules enforce these layer boundaries without granting services or features access to drivers.

## State architecture

Each open table has a session identified by a stable session ID:

```text
Table session
  ├── Connection and table identity
  ├── Column metadata
  ├── Loaded pages and row identities
  ├── Filter and sort specification
  ├── Pending changes
  ├── Selection and scroll position
  └── Loading, saving, and error status
```

Separate three categories:

1. **Fetched data:** the last known database values.
2. **Pending changes:** staged inserts, updates, and deletions.
3. **Presentation state:** cursor position, column widths, scroll offsets, and editor visibility.

Editing must not overwrite the original values required for identifying rows or detecting conflicts.

Use focused stores and subscriptions rather than a single large React context. Moving the cursor should not rerender the schema explorer or unrelated tabs. Keep transient editor state local when it does not need to survive unmounting.

Protect state from stale asynchronous results. A response from an older request or closed session must not overwrite a newer view. Release subscriptions, requests, and session resources when their owners close.

## Data-grid subsystem

```text
components/data-grid/
├── index.ts
├── DataGrid.tsx                 # Grid composition
├── types.ts                     # Grid contracts, props, and hook options
├── tests/
│   ├── layout.test.ts
│   └── navigation/
│       └── move-selection.test.ts
├── rendering/
│   ├── GridHeader.tsx
│   ├── GridBody.tsx
│   └── GridCell.tsx
├── layout/                      # Widths, positions, visible ranges
├── navigation/                  # Keyboard movement and selection
├── scrolling/                   # Viewport and scroll behavior
└── formatting/                  # Display-only value formatting
```

The grid receives visible data, column descriptions, decorations, and callbacks. It knows nothing about connections, SQL, or saving transactions. The table-browser feature translates domain values and pending edits into the grid contract.

Render and format the visible viewport with a bounded cache. Avoid building elements for the entire result set or measuring every value on each navigation event. Database type decoding belongs in the adapter, not display formatting.

The [component gallery](component-gallery.md), launched with `bun run gallery`, provides independent scenarios for wide grids, empty states, long values, Unicode, editors, terminal resizing, and themes. Use it to refine styling and interaction without a live database.

## Feature module structure

```text
features/table-browser/
├── index.ts
├── types.ts                     # Feature contracts, props, and hook options
├── tests/                       # Meaningful behavior tests, when needed
├── TableBrowser.tsx
├── TableToolbar.tsx
├── TableStatus.tsx
├── hooks/
│   ├── use-table-page.ts
│   └── use-table-actions.ts
├── commands/                    # Refresh, edit, apply, discard
└── presenters/                  # Domain data to component props
```

Separate loading, editing, and navigation where they have distinct responsibilities. Avoid one oversized feature hook.

Likewise, services should use focused operations rather than sprawling classes. Prefer functions and small objects; introduce classes where ownership or lifecycle benefits.

## Module interaction and dependency boundaries

```text
User input
    ↓
Component callback
    ↓
Feature action
    ├── Updates presentation state
    └── Calls application service
                ↓
          Database contract
                ↓
          PostgreSQL adapter
                ↓
            PostgreSQL

Result → feature updates state → subscribed components render
```

Enforce these boundaries:

- Components do not import services, adapters, or application stores.
- State does not execute SQL or import React components.
- Services depend on domain models and ports, not concrete adapters.
- Adapters do not import features or state.
- Features communicate through explicit actions, services, or shared session state rather than each other's internals.
- App startup is the composition point for concrete implementations.

Each meaningful module exposes its public API through `index.ts`. Other modules use that entry point; internal files can use direct relative imports. Avoid a root barrel exporting the entire application. Enforce dependency directions with lint rules.

## Types and test organization

Keep named types and interfaces in a module-local `types.ts`. This includes component props, hook options, store contracts, and operation inputs/results. A substantial nested subsystem can own a separate `types.ts`; do not collect unrelated types in a global directory. Keep primitive annotations and useful inference inline rather than inventing aliases for every value.

Use `import type` for type dependencies. Re-export only the types needed by other modules through the owning `index.ts`; internal types remain accessible directly within the module. Type imports obey the same layer boundaries as runtime imports. Inferred contracts may reference factories with type-only imports, without introducing runtime dependencies.

Group tests in the owning module's `tests/` directory, mirroring nested responsibilities when useful. For example, grid navigation tests live in `src/components/data-grid/tests/navigation/`, while application lifecycle tests live in `src/app/tests/`. Keep test helpers and fixtures inside those directories. ESLint prevents production imports of test files and everything under `tests/`, including helpers without a test suffix.

Tooling uses `tools/tests/` and `tools/release/tests/`. Reserve the proposed root `tests/` directory for cross-module integration, adapter-contract, and performance suites when those are implemented. Bun discovers module-local tests with `bun run test`; moving tests does not change the validation commands.

## Database editing guarantees

Stage inserts, updates, and deletions separately from fetched data. Distinguish NULL, empty text, and use-default values. Initially enable writes only for base tables with primary keys, including composite keys. Identify changed rows by their original keys, parameterize values, quote identifiers correctly, and detect concurrent-change conflicts.

Apply pending mutations in a transaction. On failure, roll back and preserve pending edits. Refresh successful changes to capture generated values. Distinguish a failed save from a successful save followed by a failed refresh so changes are not accidentally submitted twice. Discard restores fetched state.

Start with structured column/operator/value filters. Arbitrary SQL query results remain read-only until reliable editability rules are designed.

## Validation

- Keep tests for domain rules, state transitions, and focused operations in the owning module’s `tests/` directory. Test meaningful behavior and regressions rather than file structure or trivial wiring.
- Use a disposable PostgreSQL instance for integration tests covering composite keys, defaults, NULL, exact numeric values, constraint failures, rollback, and concurrent edits.
- Maintain shared adapter contract tests for future engines, with capability-aware expectations.
- Measure grid responsiveness and memory use during sustained navigation, resizing, and background queries.
- Exercise reusable components independently through the gallery.

## Readability and file size

Use roughly 150–250 lines as a review signal, not a hard limit. Split files by responsibility, not arbitrary length.

- Keep one principal component or operation per file.
- Prefer purpose-based names such as `fetch-table-page.ts` over `helpers.ts`.
- Promote utilities into `shared/` only when multiple modules genuinely need them.
- Avoid unnecessary forwarding layers and one-line abstractions.
- Keep public APIs small and document ownership and lifecycle where relevant.

## Initial delivery target

Prove the architecture with a reusable mock grid, a table-session store, a browse-table service, and a PostgreSQL adapter. Complete the workflow from connection through browsing and staged editing before expanding to SQL consoles, multiple database engines, or runtime plugins.
