# Pond release readiness

Track work and completion in the [Pond GitHub Project](https://github.com/users/0x4bs3nt/projects/5). These are release readiness criteria, not GitHub milestones or a second task tracker. See [architecture.md](architecture.md) for design guidance.

## Release criteria

Release at meaningful, usable milestones rather than after each feature PR. Phase 1 shipped in 0.2.0. Standalone packaging shipped in 0.3.0, followed by release-tooling fixes in 0.3.1 and 0.3.2, expanded platform coverage in 0.3.3, and the Unix installer in 0.3.4. Version numbers below are targets; calculate the actual next version from the latest release when preparing the promotion PR.

| Target version | Milestone                          | Completion criteria                                                                                                                                                                                             | Status   |
| -------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `0.1.0`        | Initial workspace prototype        | Read-only mock workspace and working release automation.                                                                                                                                                        | Released |
| `0.2.0`        | Phase 1: polished grid prototype   | Complete the phase 1 scope, including mock cell editing, visible pending changes, multiline/JSON editing, a tab bar, and validation of navigation, resizing, and edge cases.                                    | Released |
| `0.3.0`        | Standalone executable distribution | Build and smoke-test Linux x64, macOS ARM64, and Windows x64 archives; complete manual platform checks and bundled-license verification; publish verified archives and checksums from the exact release commit. | Released |
| `0.4.0`        | Phase 2: PostgreSQL browsing       | Connect to PostgreSQL, discover schemas and table metadata, and browse bounded pages of real rows asynchronously in a read-only view.                                                                           | Pending  |
| `0.5.0`        | Phase 3: reliable staged editing   | Apply and discard edits, inserts, and deletions with the transaction, identity, conflict, and failure-handling guarantees described in [architecture.md](architecture.md#database-editing-guarantees).          | Pending  |
| `0.6.0` onward | Phase 4: comfortable browsing      | Release coherent, validated sets of browsing improvements; this phase can span multiple minor releases.                                                                                                         | Pending  |

Bug fixes to an existing release can ship as patch releases, such as `0.2.1`, without waiting for a phase to finish. Treat `1.0.0` as a separate readiness decision once real-world browsing and editing are dependable, rather than an automatic consequence of finishing a phase. Use the supported `Release-As: 1.0.0` footer when that decision is made.

Phase 1 validation is complete on Linux; see [the grid measurements and interaction results](grid-performance.md). Phase 1 was released as 0.2.0. Packaging CI and maintainer manual checks now also pass on Linux, macOS, and Windows; see [packaging validation](packaging.md). This does not establish compatibility with every terminal/font combination.

All eight platform archives are published in 0.3.3, including Intel macOS, Linux ARM64/glibc, Windows ARM64, and Linux x64/ARM64 musl. The [bundled-license review](dependency-licenses.md) and checksums accompany the release. All eight targets passed native packaging CI; the original three also have manual validation. See [packaging](packaging.md) for the distinction.

Release notes must distinguish the mock demo from PostgreSQL functionality and state that macOS/Windows builds are unsigned. Signing/notarization remains deferred. The Unix installer and its installation/upgrade validation (#48) shipped in 0.3.4, completing standalone delivery (#44). Reserve 0.4.0 for PostgreSQL. Package-manager delivery (#45–#47) remains separate. Diagnostics (#43), database contracts (#15), and managed PostgreSQL connections (#16) are implemented on the development line. Catalog discovery, exact values, asynchronous real browsing and integration validation (#17–#21) remain before 0.4.0 is ready.

### Milestone completion reminders

When finishing work on a project ticket, check whether it completes a release milestone. If the criteria and relevant validation are satisfied, update its status and explicitly remind the user that the milestone is ready for a release. Summarize what shipped and any remaining blockers before suggesting a `dev → main` promotion PR. Do not publish a release automatically because a milestone is complete. After publication, record the actual released version here.

## Phase scope

- Phase 1: a mock workspace with explorer, keyboard-accessible tabs, grid, status hints, single-line and multiline/JSON editing, separate pending changes, and discard. Validate focus, mouse/keyboard navigation, fixed headers, scrolling, wide tables, long values, Unicode, terminal resizing, and sustained navigation. Exercise reusable components in an independent gallery.

- Phase 2: begin with one active PostgreSQL connection and one table view. Discover schemas and accurate metadata, preserve exact database values, and fetch bounded pages asynchronously. Keep views read-only and reject stale responses.

- Phase 3: support staged inserts, updates, and deletions, explicit Apply/Discard, database defaults, primary-key identities, conflict detection, transactional rollback, and safe recovery when refresh fails after a successful save.

- Phase 4: release coherent groups of structured filters, sorting, deterministic pagination, persistent table tabs, structure inspection, copy, refresh, command palette, cancellation, and connection-loss recovery. The SQL console is later work, with read-only results.
