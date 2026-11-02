# Changelog

## 0.3.1

fix(release): avoid stale draft lookup during publication (#62)

Fix release publication occasionally failing immediately after creating a draft. The publisher now uses GitHub’s creation response directly, avoiding a stale release-list lookup while preserving safe retries and asset verification.

## 0.3.0

feat: distribute standalone Pond executables (#59)

This release adds standalone Pond executables for Linux x64, macOS Apple Silicon, and Windows x64. Users can run Pond without installing Bun or cloning the repository.

## Downloads and packaging

- Publish versioned platform archives with SHA-256 checksums, build metadata, source maps, and license notices.
- Bundle a pinned Bun runtime and OpenTUI dependencies.
- Support `pond`, `pond --version`, and `pond logs` from the extracted installation.

## Release reliability

- Build and smoke-test every supported platform from the exact release commit.
- Verify uploaded assets before publishing the release.
- Resume interrupted draft uploads without overwriting conflicting assets.
- Validate relevant PR changes without generating duplicate artifacts on pushes to dev.

## Validation

All three platform builds and automated smoke checks passed CI. Manual testing passed on NixOS x64, macOS Tahoe 26.6 on Apple Silicon, and Windows 11 x64.

Local validation passed typechecking, linting, formatting, and all 125 tests. Regression coverage includes release retries, artifact integrity, subprocess environment handling, and forced cleanup of unresponsive smoke-test processes.

## Current limitations

Pond still uses mock data; PostgreSQL connections and database writes are not included. Pending edits remain memory-only.

macOS builds are not Developer ID signed or notarized and currently require a Gatekeeper override. Windows builds are unsigned and may display an unknown-publisher prompt.

Package-manager integrations and installation scripts remain follow-up work.

## 0.2.0

feat: add mock cell editing, workspace tabs, and runtime diagnostics (#57)

## Workspace and editing

- Edit single-line, multiline, and JSON cell values, including explicit NULL values.
- Stage changes separately from original data, highlight modified cells, and discard edits.
- Keep keyboard focus inside editors while typing.
- Open and switch between table tabs while preserving pending edits.
- Require explicit discard before closing a tab with unsaved changes.
- Show context-sensitive keyboard hints.

## Reliability and performance

- Add error boundaries, fatal-error handling, and terminal cleanup.
- Record bounded, sanitized local logs with commands to inspect and follow them.
- Improve development restarts by debouncing saves and restoring the terminal.
- Reuse grid viewport nodes, bound long-value preview processing, and support large row numbers.
- Fix memory growth caused by retained React performance measurements.

## Development tooling

- Add an independent component gallery with editing, theme-preview, and stress scenarios.
- Add CPU profiling and a repeatable grid benchmark.
- Organize module types and tests, and document architecture and release criteria.

## Validation

All 123 tests passed, along with typechecking, linting, and formatting checks.

Linux validation covered navigation, editing, focus, resizing, and pending-change preservation. An 8,000-input benchmark with 100,000 mock rows and 256 columns exercised both scrolling axes, maintained 463 rendered nodes, and recorded 5.27–6.63 ms p95 input-to-render latency.

## Current scope

Pond still uses mock data. PostgreSQL connections, database writes, packaged executables, and installers are not included. Pending edits remain memory-only and do not survive application exit.

Performance measurements exclude terminal-output latency and database workloads. macOS and Windows were not validated.

## 0.1.0

feat: introduce Pond's terminal workspace prototype (#7)

Initial Pond terminal workspace prototype.

- Browse mock tables through a schema explorer.
- Navigate cells with the keyboard and mouse.
- Scroll tables with fixed column headers.
- Inspect column types and selected values.
- Resize the workspace with the terminal.

This version uses mock data. PostgreSQL connections and cell editing
are not available yet.
