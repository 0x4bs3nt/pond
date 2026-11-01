# Pond release readiness

Track work and completion in the [Pond GitHub Project](https://github.com/users/0x4bs3nt/projects/5). These are release readiness criteria, not GitHub milestones or a second task tracker. See [architecture.md](architecture.md) for design guidance.

## Release criteria

Release at meaningful, usable milestones rather than after each feature PR. The next planned release is after phase 1 is complete. Version numbers below are targets; calculate the actual next version from the latest release when preparing the promotion PR.

| Target version | Milestone                        | Completion criteria                                                                                                                                                          | Status   |
| -------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `0.1.0`        | Initial workspace prototype      | Read-only mock workspace and working release automation.                                                                                                                     | Released |
| `0.2.0`        | Phase 1: polished grid prototype | Complete the phase 1 scope, including mock cell editing, visible pending changes, multiline/JSON editing, a tab bar, and validation of navigation, resizing, and edge cases. | Pending  |
| `0.3.0`        | Phase 2: PostgreSQL browsing     | Connect to PostgreSQL, discover schemas and table metadata, and browse bounded pages of real rows asynchronously in a read-only view.                                        | Pending  |
| `0.4.0`        | Phase 3: reliable staged editing | Apply and discard edits, inserts, and deletions with the transaction, identity, conflict, and failure-handling guarantees described in [architecture.md](architecture.md#database-editing-guarantees).                                   | Pending  |
| `0.5.0` onward | Phase 4: comfortable browsing    | Release coherent, validated sets of browsing improvements; this phase can span multiple minor releases.                                                                      | Pending  |

Bug fixes to an existing release can ship as patch releases, such as `0.2.1`, without waiting for a phase to finish. Treat `1.0.0` as a separate readiness decision once real-world browsing and editing are dependable, rather than an automatic consequence of finishing a phase. Use the supported `Release-As: 1.0.0` footer when that decision is made.

### Milestone completion reminders

When finishing work on a project ticket, check whether it completes a release milestone. If the criteria and relevant validation are satisfied, update its status and explicitly remind the user that the milestone is ready for a release. Summarize what shipped and any remaining blockers before suggesting a `dev → main` promotion PR. Do not publish a release automatically because a milestone is complete. After publication, record the actual released version here.

## Phase scope

- Phase 1: a mock workspace with explorer, keyboard-accessible tabs, grid, status hints, single-line and multiline/JSON editing, separate pending changes, and discard. Validate focus, mouse/keyboard navigation, fixed headers, scrolling, wide tables, long values, Unicode, terminal resizing, and sustained navigation. Exercise reusable components in an independent gallery.

- Phase 2: begin with one active PostgreSQL connection and one table view. Discover schemas and accurate metadata, preserve exact database values, and fetch bounded pages asynchronously. Keep views read-only and reject stale responses.

- Phase 3: support staged inserts, updates, and deletions, explicit Apply/Discard, database defaults, primary-key identities, conflict detection, transactional rollback, and safe recovery when refresh fails after a successful save.

- Phase 4: release coherent groups of structured filters, sorting, deterministic pagination, persistent table tabs, structure inspection, copy, refresh, command palette, cancellation, and connection-loss recovery. The SQL console is later work, with read-only results.
