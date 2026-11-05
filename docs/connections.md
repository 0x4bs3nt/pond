# PostgreSQL connections

Pond starts with the saved-connections list. It supports one PostgreSQL session at a time. Connecting opens the real schema explorer and column metadata. Real row decoding and browsing follow in #18–#19; connecting does not display demo rows as database data. The explicitly labelled **F2 Mock demo (development)** entry opens the mock workspace; F2 outside an editor returns. Switching views preserves the active connection, workspace selection and pending mock edits. Mock edits remain memory-only.

## Configure and connect

Use Up/Down or click to select a saved connection. The list shows its non-secret endpoint, database, user, TLS mode and active status. Long lists scroll with selection or the mouse wheel. Loading, empty and load-error states have separate guidance; **F5** reloads profiles after fixing a file or storage problem.

- **Ctrl+N New** opens a separate form. **Ctrl+E Edit** edits the selected profile while retaining its ID.
- Fill in name, host (DNS name or IP address), port, database, user, and TLS mode. Tab / Shift+Tab moves between fields; clicking a field focuses it. On TLS, use Left/Right, Space, Enter, or click to change the mode. Validation appears beside the affected field.
- **Ctrl+S Save** persists the form; **Esc Cancel** returns without changing saved settings. Validation and storage failures keep the draft available for correction and retry. Saving an active profile does not change the running session; explicitly reconnect to apply the saved settings.
- **Delete** opens confirmation. **Ctrl+Y Delete** confirms; **Esc Cancel** keeps the profile. Only saved configuration is removed: the database and its data are never deleted. An active connection must close successfully before its profile can be removed. Cleanup or storage failure keeps the profile and offers a retry. Successful deletion selects the nearest remaining entry.
- **Enter / Ctrl+R Connect** prompts for a password and connects to the selected saved profile, replacing any existing session. Using this action on an active profile explicitly reconnects with its saved settings.
- In the password prompt, **Enter** connects, **Esc** cancels, **Backspace** deletes, and **Ctrl+U** clears. Typing and bracketed paste are masked. An empty password is allowed for servers that do not require one.
- **F3 Workspace** returns to the active session without reconnecting. **F2 / Esc** in the real workspace returns to the manager without disconnecting.
- **Ctrl+D Disconnect** explicitly closes the session. **Esc** cancels an in-flight connection attempt. Cleanup failure requires a successful disconnect retry before another connection can open.
- **Ctrl+C** exits, including while a connection is pending. In the mock workspace, `q` outside an editor also exits.

Actions have clickable labels. Saving, deletion and connection progress disable conflicting actions. Form and password views own input; shortcuts cannot navigate or discard edits in a hidden workspace. Use at least 60 columns × 20 rows for the manager. Smaller terminals show a resize notice and preserve drafts until resized. A connection attempt times out after ten seconds; input and rendering remain responsive while it runs. Replacing a connection first closes the previous session. A failed connection leaves the list available for editing and retry.

| TLS mode                | Behavior                                                                                       |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| `verify-full` (default) | Requires TLS and verifies the server certificate and hostname using the runtime's trusted CAs. |
| `require`               | Requires encryption without verifying the server's identity.                                   |
| `disable`               | Plain TCP, without TLS.                                                                        |

There is no opportunistic fallback to plaintext. Custom CA/client-certificate fields, SSH tunnels, cloud authentication and OS credential storage are outside this slice. The password is requested for each attempt, handed to the driver through the credential interface, and never written to profiles or logs. Ambient `PGPASSWORD` and `.pgpass` passwords are not used. JavaScript/driver memory is not guaranteed to be securely erased.

Authentication, unreachable-host, missing-database and TLS failures show fixed actionable messages; raw driver/server messages are not displayed or logged. A server-closed session becomes disconnected and can be reconnected manually.

## Explore schemas and columns

After connecting, the explorer lists non-system schemas available to the current role and relations with table-level or column-level SELECT access. Empty schemas remain visible. Regular and partitioned tables, views, materialized views, and foreign tables are supported; non-table kinds are labelled explicitly. Column-level access makes metadata visible but does not imply permission to read every column or to edit rows.

- **Up/Down** selects a relation; **Enter** or a click loads its column definitions.
- **Tab / Shift+Tab** switches between the explorer and the metadata grid. The grid supports arrow keys, paging, mouse selection, and scrolling. Its selected field is shown below the grid.
- **F5** refreshes discovery and clears the selected description. Use it to retry a failed request or discover schema changes.
- **F2 / Esc** returns to the connection manager without disconnecting; **Ctrl+D** disconnects; **Ctrl+C** quits.

The metadata grid preserves column order and native type modifiers. It shows catalog nullability, ordered primary-key positions, default expressions, identity modes, and stored/virtual generated expressions. Domain types retain their native names and inherited nullability/defaults. Dropped and internal columns are excluded. Names are kept as separate identifier parts, so spaces, case, dots, and reserved words are not reinterpreted as SQL.

Loading, empty, missing-relation, permission, and timeout states are separate from successful metadata. Catalog statements have a ten-second server timeout. A late result cannot replace a newer selection, refreshed catalog, or closed explorer. Metadata is descriptive and read-only; it does not yet establish write eligibility. Use a terminal at least 60 × 16 for this screen.

## Profile files

Profiles use `profiles.json` with schema version `1`. #79 will deliver the shared versioned TOML configuration and migration; this initial representation stays behind the profile port.

| Platform | Directory                                                           |
| -------- | ------------------------------------------------------------------- |
| Linux    | `$XDG_CONFIG_HOME/pond`, falling back to `~/.config/pond`           |
| macOS    | `~/Library/Application Support/Pond`                                |
| Windows  | `%APPDATA%\Pond`, falling back to the user's `AppData\Roaming\Pond` |

An absolute `POND_CONFIG_DIR` overrides this directory. Relative overrides and relative `XDG_CONFIG_HOME` values are ignored. Files contain profile IDs/names, engine, database, host, port, user and TLS mode. They contain no password or credential URL. New directories use `0700` and files use `0600` where supported; existing directory permissions are unchanged.

Saves and deletions use a serialized temporary-file replacement and preserve other saved profiles. Editing retains the profile ID and list position. Invalid files, duplicate IDs, unknown fields and unsupported versions are rejected without overwriting the file. Storage failures leave the form or deletion confirmation available. Fix a bad file and retry, or use F5 in the list to reload it. Concurrent editing by multiple app processes or an external editor is not coordinated yet; close Pond before editing the file manually. OS keyring integration (#81) remains deferred; this feature does not store passwords.

## Validation

`bun run check` covers profile creation/editing/deletion across reloads, secret exclusion, damaged/newer-file preservation, draft recovery after validation/storage errors, active-profile reconnect and deletion failure ordering, session ownership and cancellation, masked typing/paste and retry, hidden-workspace input isolation, pending-edit preservation, safe error mapping, and bounded shutdown. A TCP fixture deliberately stalls authentication to verify that cancellation actually releases its socket.

Connection-manager validation on Linux with PostgreSQL 17.11 exercised the real `bun run dev` terminal flow: create/edit/cancel/delete persistence, masked password entry, resizing, metadata navigation, active-profile editing without changing the backend PID, and active-profile deletion without changing database data. Exit restored the terminal and produced no fatal logs or exposed passwords. Headless interaction checks exercised mouse actions, loading/error/retry/empty states and drafts across 40 × 10, 60 × 20 and 100 × 24 sizes. The selectable-list gallery was checked with keyboard, mouse, scrolling, focus and resizing in all three preview palettes, including `bun run gallery` terminal smoke checks.

Catalog adapter tests create a disposable PostgreSQL instance when `initdb` and `postgres` are on PATH and the user is not root; otherwise they skip. Run `bun test src/adapters/databases/postgres/tests` with those tools available. They cover quoted identifiers, dropped columns, exact native types, nested domains, defaults, identity/generated columns, composite-key order, relation kinds, visibility, and closed sessions. Explorer tests protect against stale responses and verify error recovery. Linux PostgreSQL 17.11 validation also exercised the real terminal connection/explorer flow, refresh after DDL, resize, disconnect/reconnect, connection loss, and terminal restoration.

Linux validation used a disposable PostgreSQL 17.9 server with SCRAM authentication: correct/incorrect passwords, missing database, unreachable port, TLS required, untrusted-certificate rejection, trusted-certificate success, connection replacement, disconnect, and shutdown. The real terminal workflow was checked with diagnostics off/on, including resizing and switching to/from the demo; no passwords appeared in terminal output, profiles or logs. Other platforms still need their normal CI/package and interactive validation. This ticket alone does not complete the 0.4.0 browsing milestone.
